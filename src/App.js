import './App.css';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import LandingPage from './pages/LandingPage';
import { useState } from 'react';

const App = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [initialAudioFile, setInitialAudioFile] = useState(null);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<LandingPage setSelectedImage={setSelectedImage} setProcessedImage={setProcessedImage} setInitialAudioFile={setInitialAudioFile} />} />
          <Route path='home' element={<Home selectedImage={selectedImage} processedImage={processedImage} setSelectedImage={setSelectedImage} setProcessedImage={setProcessedImage} initialAudioFile={initialAudioFile} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;