// src/components/WheelDiagram.js
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
    { name: 'Família', color: '#FF6B6B' },
    { name: 'Social', color: '#4ECDC4' },
    { name: 'Relacionamentos', color: '#45B7D1' },
    { name: 'Profissional', color: '#96CEB4' },
    { name: 'Qualidade', color: '#FFEAA7' },
    { name: 'Pessoal', color: '#DDA0DD' },
    { name: 'Financeiro', color: '#98D8C8' },
    { name: 'Espiritual', color: '#F7DC6F' }
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

          return (
            <path
              key={index}
              d={pathData}
              fill={area.color}
              stroke="white"
              strokeWidth="2"
              opacity={data ? (area.percentage || 0) / 100 : 0.8}
            />
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