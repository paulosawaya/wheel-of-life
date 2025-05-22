// frontend/src/pages/LoginPage.js
import React from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../contexts/AuthContext';
import { useApi } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const FormCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 3rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h1`
  color: #333;
  text-align: center;
  margin-bottom: 2rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
`;

const Label = styled.label`
  color: #333;
  margin-bottom: 0.5rem;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 1rem;
  border: 2px solid ${props => props.error ? '#e74c3c' : '#ddd'};
  border-radius: 10px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: ${props => props.error ? '#e74c3c' : '#4ECDC4'};
    box-shadow: 0 0 0 3px ${props => props.error ? 'rgba(231, 76, 60, 0.1)' : 'rgba(78, 205, 196, 0.1)'};
  }
`;

const ErrorMessage = styled.span`
  color: #e74c3c;
  font-size: 0.9rem;
  margin-top: 0.5rem;
`;

const Button = styled.button`
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 1rem;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
  margin-top: 1rem;
  position: relative;

  &:hover:not(:disabled) {
    background: #45b7b8;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const LinkText = styled.p`
  text-align: center;
  margin-top: 1rem;
  color: #666;
`;

const StyledLink = styled(Link)`
  color: #4ECDC4;
  text-decoration: none;
  font-weight: bold;

  &:hover {
    text-decoration: underline;
  }
`;

// IMPROVEMENT: Form validation schema
const loginSchema = yup.object().shape({
  email: yup
    .string()
    .email('Digite um email válido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .required('Senha é obrigatória')
});

const LoginPage = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(loginSchema)
  });
  const { login } = useAuth();
  const { request, loading } = useApi();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      await request(
        () => login(data.email, data.password),
        { 
          showSuccess: true, 
          successMessage: 'Login realizado com sucesso!' 
        }
      );
      navigate('/');
    } catch (error) {
      // Error already handled by useApi hook
    }
  };

  return (
    <Container>
      <FormCard>
        <Title>Entrar</Title>
        <Form onSubmit={handleSubmit(onSubmit)}>
          <InputGroup>
            <Label htmlFor="email">Email</Label>
            <Input
              {...register('email')}
              type="email"
              id="email"
              placeholder="seu@email.com"
              error={!!errors.email}
              aria-invalid={!!errors.email}
            />
            {errors.email && <ErrorMessage>{errors.email.message}</ErrorMessage>}
          </InputGroup>

          <InputGroup>
            <Label htmlFor="password">Senha</Label>
            <Input
              {...register('password')}
              type="password"
              id="password"
              placeholder="Sua senha"
              error={!!errors.password}
              aria-invalid={!!errors.password}
            />
            {errors.password && <ErrorMessage>{errors.password.message}</ErrorMessage>}
          </InputGroup>

          <Button type="submit" disabled={loading}>
            {loading ? <LoadingSpinner message="" /> : 'Entrar'}
          </Button>
        </Form>
        <LinkText>
          Não tem uma conta? <StyledLink to="/register">Cadastre-se</StyledLink>
        </LinkText>
      </FormCard>
    </Container>
  );
};

export default LoginPage;