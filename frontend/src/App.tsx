import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/layout/Sidebar'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { DataExplorer } from './pages/DataExplorer'
import { AppProvider } from './context/AppContext'

function Layout() {
  return (
    <div className="min-h-screen bg-navy-950 text-white">
      <Header />
      <Sidebar />
      <main className="ml-[260px] pt-16 min-h-screen">
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
      <BrowserRouter>
        <Layout />
      </BrowserRouter>
    </AppProvider>
  )
}