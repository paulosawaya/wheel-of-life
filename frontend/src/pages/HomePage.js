// frontend/src/pages/HomePage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WheelDiagram from '../components/WheelDiagram';
import api from '../services/api';
import toast from 'react-hot-toast';
import styled from 'styled-components';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 3rem;
`;

const Title = styled.h1`
  font-size: 3rem;
  font-weight: bold;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  opacity: 0.9;
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 3rem;
  max-width: 800px;
  width: 100%;
  text-align: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const Question = styled.h2`
  color: #333;
  font-size: 1.5rem;
  margin: 2rem 0;
  line-height: 1.6;
`;

const TipsSection = styled.div`
  text-align: left;
  margin: 2rem 0;
`;

const TipsTitle = styled.h3`
  color: #333;
  margin-bottom: 1rem;
`;

const TipsList = styled.ol`
  color: #666;
  line-height: 1.8;
`;

const StartButton = styled.button`
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;

  &:hover {
    background: #45b7b8;
  }
`;

const AuthSection = styled.div`
  position: absolute;
  top: 2rem;
  right: 2rem;
  display: flex;
  gap: 1rem;
`;

const AuthButton = styled.button`
  background: transparent;
  color: white;
  border: 2px solid white;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: white;
    color: #667eea;
  }
`;

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();

  const startAssessment = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post('/assessments');
      const assessmentId = response.data.id;
      navigate(`/assessment/${assessmentId}`);
    } catch (error) {
      toast.error('Erro ao iniciar avaliação');
    }
  };

  return (
    <Container>
      <AuthSection>
        {isAuthenticated ? (
          <AuthButton onClick={logout}>Sair</AuthButton>
        ) : (
          <>
            <AuthButton onClick={() => navigate('/login')}>Entrar</AuthButton>
            <AuthButton onClick={() => navigate('/register')}>Cadastrar</AuthButton>
          </>
        )}
      </AuthSection>

      <Header>
        <Title>RODA DA VIDA</Title>
        <Subtitle>Mapeie a relação e o equilíbrio entre as diversas áreas de sua vida!</Subtitle>
      </Header>

      <ContentCard>
        <WheelDiagram />
        
        <Question>
          Você está pronta(o) para entender como estão 
          as diferentes áreas da sua vida nesse momento?
        </Question>

        <TipsSection>
          <TipsTitle>DICAS:</TipsTitle>
          <TipsList>
            <li>Escolha um momento tranquilo para fazer o teste.</li>
            <li>Não pense muito, a primeira resposta geralmente será a mais correta.</li>
            <li>Responda pensando em quem você é e não em quem gostaria de ser.</li>
            <li>Se mentir estará enganando apenas a si mesma(o), por isso, seja sincera(o).</li>
          </TipsList>
        </TipsSection>

        <div style={{ textAlign: 'center' }}>
          <p style={{ marginBottom: '1rem', color: '#666' }}>Clique no botão!</p>
          <StartButton onClick={startAssessment}>
            COMEÇAR TESTE
          </StartButton>
        </div>
      </ContentCard>
    </Container>
  );
};

export default HomePage;