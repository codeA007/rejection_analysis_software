import { Navigate, Route, Routes } from 'react-router-dom'
import { LayoutProvider } from './components/layout/LayoutContext'
import Sidebar from './components/layout/Sidebar'
import TopNavbar from './components/layout/TopNavbar'
import HomePage from './features/home/pages/HomePage'
import PartsPage from './features/parts/pages/PartsPage'
import ProductionPage from './features/production/pages/ProductionPage'
import RejectionsPage from './features/rejections/pages/RejectionsPage'
import MonthlyPage from './features/monthly/pages/MonthlyPage'
import YieldPage from './features/yield/pages/YieldPage'
import SettingsPage from './features/settings/pages/SettingsPage'

function App() {
  return (
    <LayoutProvider>
      <div className="flex h-screen overflow-hidden bg-neutral-50">
        <Sidebar />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <TopNavbar />

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/parts" element={<PartsPage />} />
              <Route path="/production" element={<ProductionPage />} />
              <Route path="/rejections" element={<RejectionsPage />} />
              <Route path="/yield" element={<YieldPage />} />
              <Route path="/monthly" element={<MonthlyPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </LayoutProvider>
  )
}

export default App
