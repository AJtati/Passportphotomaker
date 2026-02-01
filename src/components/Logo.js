import React from 'react';

const Logo = ({ size = 40 }) => (
  <img 
    src={process.env.PUBLIC_URL + '/logo1.png'} 
    alt="App Logo" 
    style={{ 
      width: `${size}px`, 
      height: 'auto',
      marginRight: '10px' 
    }} 
  />
);

export default Logo;
