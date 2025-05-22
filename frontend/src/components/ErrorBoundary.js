// frontend/src/components/ErrorBoundary.js
import React from 'react';
import styled from 'styled-components';

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  text-align: center;
`;

const ErrorCard = styled.div`
  background: white;
  color: #333;
  padding: 3rem;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  max-width: 500px;
  width: 100%;
`;

const ErrorTitle = styled.h2`
  margin-bottom: 1rem;
  color: #e74c3c;
`;

const ErrorMessage = styled.p`
  margin-bottom: 2rem;
  line-height: 1.6;
`;

const ReloadButton = styled.button`
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

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorCard>
            <ErrorTitle>Oops! Algo deu errado</ErrorTitle>
            <ErrorMessage>
              Desculpe, ocorreu um erro inesperado. Por favor, recarregue a página e tente novamente.
            </ErrorMessage>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginBottom: '2rem', textAlign: 'left' }}>
                <summary>Detalhes do erro (desenvolvimento)</summary>
                <pre style={{ fontSize: '0.8rem', overflow: 'auto' }}>
                  {this.state.error.toString()}
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <ReloadButton onClick={() => window.location.reload()}>
              Recarregar Página
            </ReloadButton>
          </ErrorCard>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
import React from 'react';
import styled from 'styled-components';

const WheelContainer = styled.div`
  display: flex;
  justify-content: center;
  margin: 2rem 0;
`;

const WheelSVG = styled.svg`
  width: 200px;
  height: 200px;
`;

const WheelDiagram = ({ data = null }) => {
  const defaultAreas = [
    { name: 'Pessoal', color: '#FF6B6B' },
    { name: 'Qualidade de Vida', color: '#4ECDC4' },
    { name: 'Profissional', color: '#45B7D1' },
    { name: 'Relacionamentos', color: '#96CEB4' }
  ];

  const areas = data || defaultAreas;
  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  const angleStep = (2 * Math.PI) / areas.length;

  return (
    <WheelContainer>
      <WheelSVG viewBox="0 0 200 200">
        {areas.map((area, index) => {
          const startAngle = index * angleStep - Math.PI / 2;
          const endAngle = (index + 1) * angleStep - Math.PI / 2;
          
          const x1 = centerX + radius * Math.cos(startAngle);
          const y1 = centerY + radius * Math.sin(startAngle);
          const x2 = centerX + radius * Math.cos(endAngle);
          const y2 = centerY + radius * Math.sin(endAngle);
          
          const largeArcFlag = angleStep > Math.PI ? 1 : 0;
          
          const pathData = [
            `M ${centerX} ${centerY}`,
            `L ${x1} ${y1}`,
            `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
            'Z'
          ].join(' ');

          // Calculate label position
          const labelAngle = startAngle + angleStep / 2;
          const labelRadius = radius * 0.7;
          const labelX = centerX + labelRadius * Math.cos(labelAngle);
          const labelY = centerY + labelRadius * Math.sin(labelAngle);

          return (
            <g key={index}>
              <path
                d={pathData}
                fill={area.color}
                stroke="white"
                strokeWidth="2"
                opacity={data ? (area.percentage || 0) / 100 : 0.8}
              />
              <text
                x={labelX}
                y={labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="10"
                fill="white"
                fontWeight="bold"
              >
                {area.name}
              </text>
            </g>
          );
        })}
        
        {/* Center circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r="15"
          fill="white"
          stroke="#ddd"
          strokeWidth="2"
        />
      </WheelSVG>
    </WheelContainer>
  );
};

export default WheelDiagram;