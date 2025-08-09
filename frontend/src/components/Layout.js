import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const BackButton = styled.button`
  position: fixed;
  top: 1rem;
  left: 1rem;
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
  z-index: 1000;

  &:hover {
    background: #45b7b8;
  }
`;

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Don't show the button on the dashboard, login, or register pages
  const showButton = !['/dashboard', '/login', '/register', '/'].includes(location.pathname);

  if (!showButton) {
    return <>{children}</>;
  }

  return (
    <>
      <BackButton onClick={() => navigate('/dashboard')}>
        Voltar ao Menu
      </BackButton>
      {children}
    </>
  );
};

export default Layout;
