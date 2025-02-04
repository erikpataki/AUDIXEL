import React from 'react';
import { useNavigate } from 'react-router-dom';
import "./LandingPage.css";

const LandingPage = ({ setSelectedImage, setProcessedImage }) => {
  const navigate = useNavigate();

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = function (event) {
        setSelectedImage(event.target.result);
        setProcessedImage(null);
        navigate('/home');
      };

      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="image-upload">
      <div className="upload-block">
        <label htmlFor="image-file-input" className='file-input-label'>
          <div className="upload-text">
            <div className='image-upload-text-main-parent'>
              <p className='image-upload-text'>Select or drag image file(s)</p>
              <p className='image-upload-text'>(.jpg, .png, .gif)</p>
            </div>
          </div>
        </label>
      </div>
      <input
        id="image-file-input"
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        style={{ display: 'none' }}
      />
    </div>
  );
};

export default LandingPage;