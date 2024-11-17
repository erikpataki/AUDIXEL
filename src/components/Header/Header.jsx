import React from 'react';
import { NavLink } from 'react-router-dom';
import './Header.css';

const Header = () => {
  return (
    <header className="header">
      <div className="logo">My Logo</div>
      <nav className="nav">
        <ul>
          <li><NavLink to="/" end>Home</NavLink></li>
          {/* <li><NavLink to="/work">Work</NavLink></li> */}
          {/* <li><NavLink to="/about">About</NavLink></li> */}
          {/* <li><NavLink to="/contact">Contact</NavLink></li> */}
        </ul>
      </nav>
    </header>
  );
};

export default Header;
