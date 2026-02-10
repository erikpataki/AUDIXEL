import React from 'react';

export const getTutorialMessage = () => (
  <div>
    <p>Welcome to AUDIXEL, an application designed to offer you a new way of visualising your music through transforming it into visual art.</p>
    
    <h2>What does AUDIXEL do?</h2>
    <p>AUDIXEL takes your songs and processes them to create abstract images. Here's a simple breakdown of how the process works:</p>
    <ol>
      <li><strong>Upload your music:</strong> Start by selecting a music file (.wav, .mp3, or .ogg) from your device.</li>
      <li><strong>Music analysis:</strong> AUDIXEL will analyse different characteristics of the audio file.</li>
      <li><strong>Image generation:</strong> Based on the analysis, AUDIXEL generates an image. The visual elements of the image are influenced by the audio's features. For example, a high-energy song might produce vibrant, dynamic visuals, while a calm, soothing track might result in a more subdued, relaxed pattern.</li>
      <li><strong>Customisation:</strong> You can tweak various settings to customise the generated image. Adjust the intensity or angle of the pixel sorting, select different sorting modes (like brightness, hue, or saturation), or even change the outputted resolution to get the perfect result you're looking for.</li>
      <li><strong>Download and share:</strong> Once you're happy with the generated image, you can download it and use it in whatever way you wish.</li>
    </ol>
    
    <h2>Try it now</h2>
    <p style={{ marginBottom: '0' }}>Curious what your song looks like? Upload your track to find out.</p>
  </div>
);
