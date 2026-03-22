"""JobManager — múltiplos jobs em paralelo, cada um com seu próprio Playwright."""
from __future__ import annotations
import threading
from concurrent.futures import ThreadPoolExecutor
from app.core import settings
from app.schemas.persona import PersonaResponse
from app.services.google.drive_storage import GoogleDriveStorage
from app.services.google.sheets_log import GoogleSheetsLog
from app.services.rpa.exceptions import PersonNotFoundException
from .models import JobState, JobStatus, Stage, make_job_id

# Estágios que indicam que a pessoa foi encontrada — retry vale a pena
_RETRY_THRESHOLD = {
    Stage.FOUND, Stage.EXTRACTING, Stage.OPENING,
    Stage.DISCOVERED, Stage.BENEFIT_START, Stage.BENEFIT_DONE, Stage.UPLOADING,
}


class JobManager:
    def __init__(self) -> None:
        self._lock      = threading.Lock()
        self._jobs:     dict[str, JobState] = {}
        self._executor: ThreadPoolExecutor | None = None

    def start(self) -> None:
        self._executor = ThreadPoolExecutor(max_workers=settings.MAX_WORKER_JOBS)

    def stop(self) -> None:
        if self._executor:
            self._executor.shutdown(wait=True)

    def submit(self, termo: str) -> str:
        job_id = make_job_id()
        job    = JobState(job_id=job_id, termo=termo)
        with self._lock:
            self._jobs[job_id] = job
        self._executor.submit(self._run_job, job)
        return job_id

    def get(self, job_id: str) -> JobState | None:
        return self._jobs.get(job_id)

    def stream(self, job_id: str):
        job = self.get(job_id)
        if not job:
            return
        yield from job.stream()

    def _run_job(self, job: JobState) -> None:
        job.status = JobStatus.RUNNING

        last_exc: Exception | None = None

        max_retries = settings.MAX_JOB_RETRIES
        for attempt in range(1, max_retries + 1):
            try:
                self._attempt(job, attempt)
                return  # sucesso — sai do loop
            except PersonNotFoundException as exc:
                # Pessoa não encontrada — não adianta tentar de novo
                job.status = JobStatus.FAILED
                job.error  = str(exc)
                job.emit(Stage.ERROR, str(exc))
                job.close()
                return
            except Exception as exc:
                last_exc = exc
                last_stage = job.last_stage()

                # Só retenta se chegou além do SEARCHING (pessoa foi localizada)
                reached_threshold = last_stage in _RETRY_THRESHOLD

                if reached_threshold and attempt < max_retries:
                    job.emit(
                        Stage.SEARCHING,
                        f"Tentativa {attempt + 1}/{max_retries} — reIniciando a partir da busca...",
                    )
                    # Limpa eventos de erro para o stream continuar limpo
                    continue
                else:
                    break

        # Esgotou retries ou não valia tentar
        job.status = JobStatus.FAILED
        job.error  = str(last_exc)
        job.emit(Stage.ERROR, f"Erro após {attempt} tentativa(s): {last_exc}")
        job.close()

    def _attempt(self, job: JobState, attempt: int) -> None:
        """Uma tentativa completa de execução com Playwright."""
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=settings.RPA_HEADLESS,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"],
            )
            context = browser.new_context(
                accept_downloads=True,
                user_agent=(
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                    "Version/18.6 Safari/605.1.15"
                ),
                locale="pt-BR",
                viewport={"width": 1280, "height": 800},
            )
            page = context.new_page()
            page.set_default_timeout(120_000)

            try:
                from app.services.rpa.extractors import build_persona_data, navigate_to_result

                job.emit(Stage.SEARCHING, f"Buscando '{job.termo}' no portal...")
                navigate_to_result(page, job.termo, progress=job)

                job.emit(Stage.EXTRACTING, "Extraindo dados básicos...")
                data = build_persona_data(page, job.termo, progress=job)

                job.emit(Stage.UPLOADING, "Salvando no Google Drive...")
                drive = GoogleDriveStorage().save(data, fallback_name=job.termo)

                job.emit(Stage.UPLOADING, "Registrando na planilha de log...")
                GoogleSheetsLog().append(
                    job_id=job.job_id,
                    termo=job.termo,
                    data=data,
                    drive_url=drive.json_url,
                )

                job.result = PersonaResponse(
                    **data.model_dump(exclude={"screenshot_png"})
                )
                job.status = JobStatus.DONE
                job.emit(Stage.DONE, f"Concluído — {drive.folder_url}", url=drive.folder_url)

            finally:
                context.close()
                browser.close()

        job.close()


job_manager = JobManager()