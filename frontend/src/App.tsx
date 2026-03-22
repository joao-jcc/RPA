import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { DataExplorer } from './pages/DataExplorer'
import { AppProvider } from './context/AppContext'
import { useTheme } from './hooks/useTheme'

function Layout() {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <Header onToggleTheme={toggle} theme={theme} />
      <Sidebar />
      <main className="ml-[220px] pt-14 min-h-screen">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/data" element={<DataExplorer />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Layout />
      </BrowserRouter>
    </AppProvider>
  )
}
