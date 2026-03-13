# from playwright.sync_api import sync_playwright
# import time

# def coletar_dados_transparencia(termo_busca):
#     with sync_playwright() as p:
#         # 1. Iniciar o navegador (headless=False para ver o processo ocorrer)
#         browser = p.chromium.launch(headless=False)
#         page = browser.new_page()
        
#         # 2. Navegar para a busca de consultas do Portal
#         # Nota: Substitua pela URL exata da seção (ex: Consulta de Pessoas Físicas)
#         url = "https://portaldatransparencia.gov.br/consultas/beneficios-cidadao/bolsa-familia/por-municipio"
#         page.goto(url)

#         # 3. Interagir com o campo de busca
#         # Os seletores abaixo são exemplos (inspecione o site para os IDs reais)
#         page.fill('input#inputBuscaRapida', termo_busca)
#         page.press('input#inputBuscaRapida', 'Enter')

#         # 4. Aguardar o carregamento da tabela de resultados
#         # É crucial esperar por um elemento que confirme que os dados chegaram
#         page.wait_for_selector('table#listaResultados', timeout=10000)

#         # 5. Extração de Dados (Exemplo de captura de texto de uma linha)
#         dados = page.inner_text('table#listaResultados tbody tr:first-child')
#         print(f"Dados extraídos: {dados}")

#         # 6. Captura de Evidência (Screenshot)
#         # Você pode tirar da página inteira ou apenas do elemento da tabela
#         nome_arquivo = f"evidencia_{termo_busca}_{int(time.time())}.png"
#         page.screenshot(path=nome_arquivo, full_page=True)
#         # Ou apenas da tabela:
#         # page.locator('table#listaResultados').screenshot(path=f"tabela_{nome_arquivo}")

#         print(f"Evidência salva como: {nome_arquivo}")
        
#         browser.close()

# # Exemplo de uso
# coletar_dados_transparencia("123.456.789-00")