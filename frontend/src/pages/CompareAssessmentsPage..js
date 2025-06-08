// frontend/src/pages/CompareAssessmentsPage.js
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import WheelDiagram from '../components/WheelDiagram';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 3rem;
`;

const ComparisonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const AssessmentCard = styled.div`
  background: white;
  border-radius: 15px;
  padding: 2rem;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
`;

const AssessmentTitle = styled.h3`
  text-align: center;
  color: #333;
  margin-bottom: 1rem;
`;

const DateInfo = styled.p`
  text-align: center;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 2rem;
`;

const ScoreComparison = styled.div`
  margin-top: 3rem;
  background: white;
  border-radius: 15px;
  padding: 2rem;
  max-width: 1000px;
  margin: 3rem auto;
`;

const ComparisonTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 1rem;
    text-align: left;
    border-bottom: 1px solid #f0f0f0;
  }
  
  th {
    background: #f8f9fa;
    font-weight: bold;
    color: #333;
  }
  
  tr:hover {
    background: #f8f9fa;
  }
`;

const DifferenceCell = styled.td`
  color: ${props => props.value > 0 ? '#27ae60' : props.value < 0 ? '#e74c3c' : '#666'};
  font-weight: bold;
`;

const BackButton = styled.button`
  background: white;
  color: #667eea;
  border: 2px solid white;
  padding: 0.8rem 2rem;
  border-radius: 8px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  margin-bottom: 2rem;
  
  &:hover {
    background: transparent;
    color: white;
  }
`;

const CompareAssessmentsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);

  useEffect(() => {
    if (location.state && location.state.assessments) {
      setAssessments(location.state.assessments.slice(0, 3)); // Compare up to 3
    } else {
      navigate('/dashboard');
    }
  }, [location, navigate]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const calculateDifference = (newer, older) => {
    return (newer - older).toFixed(1);
  };

  if (assessments.length < 2) {
    return null;
  }

  const wheelData = assessments.map(assessment => ({
    areas: assessment.area_scores.map(score => ({
      area: score.area_name,
      percentage: score.percentage,
      score: score.score
    }))
  }));

  return (
    <Container>
      <BackButton onClick={() => navigate('/dashboard')}>
        ← Voltar ao Dashboard
      </BackButton>
      
      <Header>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
          Comparação de Avaliações
        </h1>
        <p style={{ fontSize: '1.2rem', opacity: 0.9 }}>
          Visualize sua evolução ao longo do tempo
        </p>
      </Header>

      <ComparisonGrid>
        {assessments.map((assessment, index) => (
          <AssessmentCard key={assessment.id}>
            <AssessmentTitle>{assessment.title}</AssessmentTitle>
            <DateInfo>Concluída em {formatDate(assessment.completed_at)}</DateInfo>
            <WheelDiagram
              data={wheelData[index]}
              size={300}
              interactive={false}
              showPercentages={true}
            />
          </AssessmentCard>
        ))}
      </ComparisonGrid>

      {assessments.length >= 2 && (
        <ScoreComparison>
          <h2 style={{ marginBottom: '2rem', textAlign: 'center' }}>
            Análise Detalhada
          </h2>
          <ComparisonTable>
            <thead>
              <tr>
                <th>Área</th>
                {assessments.map((assessment, index) => (
                  <th key={assessment.id}>
                    {formatDate(assessment.completed_at)}
                  </th>
                ))}
                {assessments.length >= 2 && (
                  <th>Diferença</th>
                )}
              </tr>
            </thead>
            <tbody>
              {assessments[0].area_scores.map((score, areaIndex) => (
                <tr key={areaIndex}>
                  <td>{score.area_name}</td>
                  {assessments.map((assessment) => (
                    <td key={assessment.id}>
                      {assessment.area_scores[areaIndex].score.toFixed(1)}
                    </td>
                  ))}
                  {assessments.length >= 2 && (
                    <DifferenceCell 
                      value={calculateDifference(
                        assessments[0].area_scores[areaIndex].score,
                        assessments[assessments.length - 1].area_scores[areaIndex].score
                      )}
                    >
                      {calculateDifference(
                        assessments[0].area_scores[areaIndex].score,
                        assessments[assessments.length - 1].area_scores[areaIndex].score
                      ) > 0 && '+'}
                      {calculateDifference(
                        assessments[0].area_scores[areaIndex].score,
                        assessments[assessments.length - 1].area_scores[areaIndex].score
                      )}
                    </DifferenceCell>
                  )}
                </tr>
              ))}
            </tbody>
          </ComparisonTable>
        </ScoreComparison>
      )}
    </Container>
  );
};

export default CompareAssessmentsPage;
