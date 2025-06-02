// src/pages/ResultsPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import api from '../services/api';
import toast from 'react-hot-toast';
import WheelDiagram, { processAreaResults } from '../components/WheelDiagram';

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
  text-align: center;
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
  flex: 0 0 500px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;

  @media (max-width: 1024px) {
    flex: 1;
    width: 100%;
  }
`;

const AreaSection = styled.div`
  margin-bottom: 2rem;
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 10px;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
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
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
`;

const SubcategoryName = styled.span`
  color: #666;
  font-size: 0.9rem;
`;

const SubcategoryScore = styled.span`
  color: #333;
  font-weight: bold;
`;

const ScoreBar = styled.div`
  width: 100%;
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  margin-top: 0.5rem;
  overflow: hidden;
`;

const ScoreBarFill = styled.div`
  height: 100%;
  background: ${props => props.color};
  width: ${props => props.percentage}%;
  transition: width 0.5s ease;
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
  transition: all 0.3s;
  display: block;
  margin: 2rem auto 0;

  &:hover {
    background: #45b7b8;
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(78, 205, 196, 0.3);
  }
`;

const ViewToggle = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const ToggleButton = styled.button`
  background: ${props => props.active ? '#4ECDC4' : 'white'};
  color: ${props => props.active ? 'white' : '#333'};
  border: 2px solid #4ECDC4;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: ${props => props.active ? '#45b7b8' : '#f0f0f0'};
  }
`;

const SummaryCard = styled.div`
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 10px;
  text-align: center;
  margin-bottom: 2rem;
`;

const OverallScore = styled.div`
  font-size: 3rem;
  font-weight: bold;
  color: #4ECDC4;
  margin-bottom: 0.5rem;
`;

const OverallLabel = styled.div`
  color: #666;
  font-size: 1.1rem;
`;

const ResultsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [areaResults, setAreaResults] = useState([]);
  const [subcategoryResults, setSubcategoryResults] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [overallScore, setOverallScore] = useState(0);

  useEffect(() => {
    loadResults();
  }, [id]);

  const loadResults = async () => {
    try {
      const response = await api.get(`/assessments/${id}/results`);
      setAreaResults(response.data.area_results);
      setSubcategoryResults(response.data.subcategory_results);
      
      // Calculate overall score
      const avgScore = response.data.area_results.reduce(
        (sum, area) => sum + area.percentage, 0
      ) / response.data.area_results.length;
      setOverallScore(Math.round(avgScore));
      
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

  const wheelData = processAreaResults(areaResults, subcategoryResults);

  return (
    <Container>
      <Header>
        <h1>RODA DA VIDA</h1>
        <p>Mapeie a relação e o equilíbrio entre as diversas áreas de sua vida!</p>
      </Header>

      <ContentCard>
        <ResultsTitle>Seus Resultados</ResultsTitle>
        
        <SummaryCard>
          <OverallScore>{overallScore}%</OverallScore>
          <OverallLabel>Equilíbrio Geral da Vida</OverallLabel>
        </SummaryCard>
        
        <ViewToggle>
          <ToggleButton 
            active={!showSubcategories} 
            onClick={() => setShowSubcategories(false)}
          >
            Visão por Áreas
          </ToggleButton>
          <ToggleButton 
            active={showSubcategories} 
            onClick={() => setShowSubcategories(true)}
          >
            Visão Detalhada
          </ToggleButton>
        </ViewToggle>
        
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
                    Média: {areaResult.average_score}/10 ({Math.round(areaResult.percentage)}%)
                  </AreaScore>
                  <ScoreBar>
                    <ScoreBarFill 
                      color={areaResult.color} 
                      percentage={areaResult.percentage} 
                    />
                  </ScoreBar>
                  
                  {showSubcategories && (
                    <div style={{ marginTop: '1rem' }}>
                      {subcategories.map((sub) => (
                        <SubcategoryItem key={sub.subcategory_id}>
                          <SubcategoryName>{sub.subcategory_name}</SubcategoryName>
                          <SubcategoryScore>
                            {sub.average_score}/10 ({Math.round(sub.percentage)}%)
                          </SubcategoryScore>
                        </SubcategoryItem>
                      ))}
                    </div>
                  )}
                </AreaSection>
              );
            })}
          </ResultsColumn>
          
          <WheelColumn>
            <WheelDiagram 
              data={wheelData} 
              showSubcategories={showSubcategories}
              size={400}
              interactive={true}
              showLabels={false}
              showPercentages={true}
            />
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#666', marginBottom: '1rem' }}>
                {showSubcategories 
                  ? 'Visualizando todas as 12 subcategorias'
                  : 'Visualizando as 4 áreas principais'}
              </p>
            </div>
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
