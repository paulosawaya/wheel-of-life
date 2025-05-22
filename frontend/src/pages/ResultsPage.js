// src/pages/ResultsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';
import WheelDiagram from '../components/WheelDiagram';

const Container = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem;
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 2rem;
`;

const ContentCard = styled.div`
  background: white;
  border-radius: 20px;
  padding: 3rem;
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
`;

const ResultsTitle = styled.h2`
  color: #333;
  font-size: 1.8rem;
  margin-bottom: 2rem;
`;

const ResultsLayout = styled.div`
  display: flex;
  gap: 3rem;
  align-items: flex-start;

  @media (max-width: 1024px) {
    flex-direction: column;
    align-items: center;
  }
`;

const ResultsColumn = styled.div`
  flex: 1;
`;

const WheelColumn = styled.div`
  flex: 0 0 300px;
  display: flex;
  justify-content: center;
`;

const AreaSection = styled.div`
  margin-bottom: 2rem;
`;

const AreaName = styled.h3`
  color: #333;
  font-size: 1.3rem;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const AreaColorDot = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${props => props.color};
`;

const AreaScore = styled.div`
  font-size: 1.1rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
`;

const SubcategoryItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 1rem;
  margin-bottom: 0.5rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const SubcategoryName = styled.span`
  color: #666;
  font-size: 0.9rem;
`;

const SubcategoryScore = styled.span`
  color: #333;
  font-weight: bold;
`;

const ContinueButton = styled.button`
  background: #4ECDC4;
  color: white;
  border: none;
  padding: 1rem 2rem;
  border-radius: 10px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s;
  display: block;
  margin: 2rem auto 0;

  &:hover {
    background: #45b7b8;
  }
`;

const ResultsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [areaResults, setAreaResults] = useState([]);
  const [subcategoryResults, setSubcategoryResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [id]);

  const loadResults = async () => {
    try {
      const response = await api.get(`/assessments/${id}/results`);
      setAreaResults(response.data.area_results);
      setSubcategoryResults(response.data.subcategory_results);
      setIsLoading(false);
    } catch (error) {
      toast.error('Erro ao carregar resultados');
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    navigate(`/action-plan/${id}`);
  };

  const getSubcategoriesForArea = (areaId) => {
    return subcategoryResults.filter(sub => sub.life_area_id === areaId);
  };

  if (isLoading) {
    return <div>Carregando resultados...</div>;
  }

  const wheelData = areaResults.map(result => ({
    name: result.life_area_name,
    color: result.color,
    percentage: result.percentage
  }));

  return (
    <Container>
      <Header>
        <h1>RODA DA VIDA</h1>
        <p>Mapeie a relação e o equilíbrio entre as diversas áreas de sua vida!</p>
      </Header>

      <ContentCard>
        <ResultsTitle>Resultado por Área</ResultsTitle>
        
        <ResultsLayout>
          <ResultsColumn>
            {areaResults.map((areaResult) => {
              const subcategories = getSubcategoriesForArea(areaResult.life_area_id);
              
              return (
                <AreaSection key={areaResult.life_area_id}>
                  <AreaName>
                    <AreaColorDot color={areaResult.color} />
                    {areaResult.life_area_name.toUpperCase()}
                  </AreaName>
                  <AreaScore>
                    Média Geral: {areaResult.average_score}/10 ({Math.round(areaResult.percentage)}%)
                  </AreaScore>
                  
                  {subcategories.map((sub) => (
                    <SubcategoryItem key={sub.subcategory_id}>
                      <SubcategoryName>{sub.subcategory_name}</SubcategoryName>
                      <SubcategoryScore>
                        {sub.average_score}/10 ({Math.round(sub.percentage)}%)
                      </SubcategoryScore>
                    </SubcategoryItem>
                  ))}
                </AreaSection>
              );
            })}
          </ResultsColumn>
          
          <WheelColumn>
            <WheelDiagram data={wheelData} />
          </WheelColumn>
        </ResultsLayout>

        <ContinueButton onClick={handleContinue}>
          CONTINUAR >>
        </ContinueButton>
      </ContentCard>
    </Container>
  );
};

export default ResultsPage;