// frontend/src/components/Layout.js
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';

const LayoutContainer = styled.div`
  min-height: 100vh;
  position: relative;
`;

const NavigationBar = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const BackButton = styled.button`
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    background: #45b7b8;
    transform: translateY(-2px);
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  
  span {
    color: #333;
    font-weight: 500;
  }
`;

const LogoutButton = styled.button`
  background: transparent;
  color: #666;
  border: 1px solid #ddd;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: #f8f9fa;
    border-color: #999;
  }
`;

const ContentWrapper = styled.div`
  padding-top: 80px; // Space for fixed navigation
`;

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  
  // Don't show navigation on login/register pages
  const hideNavigation = ['/login', '/register', '/'].includes(location.pathname);
  
  // Don't show back button on dashboard
  const showBackButton = location.pathname !== '/dashboard' && !hideNavigation;

  const handleBackToMenu = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (hideNavigation || !isAuthenticated) {
    return <LayoutContainer>{children}</LayoutContainer>;
  }

  return (
    <LayoutContainer>
      <NavigationBar>
        <div>
          {showBackButton && (
            <BackButton onClick={handleBackToMenu}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Voltar ao Menu
            </BackButton>
          )}
        </div>
        <UserInfo>
          <span>Olá, {user?.name || 'Usuário'}</span>
          <LogoutButton onClick={handleLogout}>Sair</LogoutButton>
        </UserInfo>
      </NavigationBar>
      <ContentWrapper>
        {children}
      </ContentWrapper>
    </LayoutContainer>
  );
};

export default Layout;