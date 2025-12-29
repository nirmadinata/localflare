import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from '@/components/landing/landing-page';
import { WikiPage } from '@/pages/wiki';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/docs" element={<WikiPage />} />
        <Route path="/docs/:section" element={<WikiPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
