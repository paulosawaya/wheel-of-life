// frontend/src/components/WheelDiagram.js
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const WheelContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin: 1rem 0; /* Adjusted margin */
`;

const Canvas = styled.canvas`
  max-width: 100%;
  height: auto;
  display: block; /* Ensure canvas doesn't have extra space below */
`;

const WheelInfo = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
`;

const CenterCircle = styled.div`
  width: 60px;
  height: 60px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  font-size: 0.9rem;
  font-weight: bold;
  color: #333;
`;

const Tooltip = styled.div`
  position: absolute;
  background: rgba(0, 0, 0, 0.85); /* Slightly darker for better contrast */
  color: white;
  padding: 8px 12px;
  border-radius: 6px; /* Slightly more rounded */
  font-size: 13px; /* Adjusted font size */
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  opacity: ${props => props.visible ? 1 : 0};
  transform: translate(-50%, -100%); /* Position above cursor */
  transition: opacity 0.15s ease-in-out;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);

  /* Arrow pointing down */
  &::after {
    content: '';
    position: absolute;
    top: 100%; /* Arrow at the bottom of the tooltip */
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 6px solid transparent;
    border-right: 6px solid transparent;
    border-top: 6px solid rgba(0, 0, 0, 0.85);
  }
`;


// This function can be exported if needed elsewhere, e.g., ResultsPage
export const processAreaResults = (areaResults, subcategoryResults) => {
  if (!areaResults || !subcategoryResults) return null;
  return {
    areas: areaResults.map(area => ({
      ...area,
      score: area.average_score, // Use average_score which is 0-10
      subcategories: subcategoryResults
        .filter(sub => sub.life_area_id === area.life_area_id)
        .map(sub => ({
          id: sub.subcategory_id,
          name: sub.subcategory_name,
          score: sub.average_score, // Use average_score which is 0-10
          parentArea: area.life_area_name
        }))
    }))
  };
};


const WheelDiagram = ({
  data = null,
  showSubcategories = false,
  size = 400,
  interactive = true,
  showLabels = false,
  showPercentages = true
}) => {
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [overallScore, setOverallScore] = useState(0);

  // Default areas structure if no data is provided
  const defaultDataStructure = {
    areas: [
      { id: 1, name: 'Pessoal', color: '#FF6B6B', score: 0, subcategories: [
        { id: 101, name: 'Saúde e disposição', score: 0 },
        { id: 102, name: 'Desenvolvimento intelectual', score: 0 },
        { id: 103, name: 'Equilíbrio emocional', score: 0 }
      ]},
      { id: 2, name: 'Qualidade de Vida', color: '#4ECDC4', score: 0, subcategories: [
        { id: 201, name: 'Plenitude e felicidade', score: 0 },
        { id: 202, name: 'Criatividade, hobbies e diversão', score: 0 },
        { id: 203, name: 'Espiritualidade', score: 0 }
      ]},
      { id: 3, name: 'Profissional', color: '#45B7D1', score: 0, subcategories: [
        { id: 301, name: 'Realização e propósito', score: 0 },
        { id: 302, name: 'Recursos financeiros', score: 0 },
        { id: 303, name: 'Contribuição social', score: 0 }
      ]},
      { id: 4, name: 'Relacionamentos', color: '#FFA07A', score: 0, subcategories: [ // LightSalmon for variety
        { id: 401, name: 'Família', score: 0 },
        { id: 402, name: 'Desenvolvimento de emoções', score: 0 },
        { id: 403, name: 'Vida social', score: 0 }
      ]}
    ]
  };

  const wheelData = data && data.areas && data.areas.length > 0 ? data : defaultDataStructure;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !wheelData || !wheelData.areas) return;

    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - (showLabels ? 50 : 20); // Adjusted for labels
    const innerRadius = Math.min(40, maxRadius * 0.2); // Ensure innerRadius is not too large

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = true;

    let segmentsToDraw = [];
    if (showSubcategories) {
      wheelData.areas.forEach(area => {
        if (area.subcategories && area.subcategories.length > 0) {
          area.subcategories.forEach(sub => {
            segmentsToDraw.push({
              name: sub.name,
              score: sub.score || 0, // Ensure score is a number
              color: area.color,
              parentArea: area.name
            });
          });
        }
      });
    } else {
      segmentsToDraw = wheelData.areas.map(area => ({
        name: area.name,
        score: area.score || 0, // Ensure score is a number
        color: area.color
      }));
    }
    
    if (segmentsToDraw.length === 0) return; // Don't draw if no segments

    const angleStep = (2 * Math.PI) / segmentsToDraw.length;

    // Calculate overall score based on what's being displayed
    const totalScoreSum = segmentsToDraw.reduce((sum, seg) => sum + (seg.score || 0), 0);
    const avgScore = segmentsToDraw.length > 0 ? totalScoreSum / segmentsToDraw.length : 0;
    setOverallScore(Math.round(avgScore * 10)); // Score is 0-10, display as percentage

    segmentsToDraw.forEach((segment, index) => {
      const startAngle = index * angleStep - Math.PI / 2;
      const endAngle = (index + 1) * angleStep - Math.PI / 2;
      const segmentScore = Math.max(0, Math.min(10, segment.score || 0)); // Clamp score between 0 and 10
      const scoreRadius = innerRadius + (maxRadius - innerRadius) * (segmentScore / 10);

      // Background segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = '#f0f0f0';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5; // Thinner lines
      ctx.stroke();

      // Filled segment
      if (segmentScore > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, scoreRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = segment.color || '#cccccc';
        ctx.globalAlpha = 0.85; // Slightly more opaque
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Labels
      if (showLabels) {
        const labelAngle = startAngle + angleStep / 2;
        const labelRadius = maxRadius + 25; // Adjusted label distance
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;

        ctx.save();
        ctx.translate(labelX, labelY);
        let rotation = labelAngle;
        if (labelAngle > Math.PI / 2 && labelAngle < 3 * Math.PI / 2) {
          rotation += Math.PI;
        }
        ctx.rotate(rotation);
        ctx.font = 'bold 10px Arial'; // Adjusted font size
        ctx.fillStyle = '#555';
        ctx.textAlign = (labelAngle > Math.PI / 2 && labelAngle < 3 * Math.PI / 2) ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(segment.name, 0, 0);
        ctx.restore();
      }
      
      // Percentage in segment
      if (showPercentages && segmentScore > 0) {
        const textAngle = startAngle + angleStep / 2;
        // Position text closer to the outer edge of the filled part
        const textRadius = innerRadius + (scoreRadius - innerRadius) * 0.75; 
        const textX = centerX + Math.cos(textAngle) * textRadius;
        const textY = centerY + Math.sin(textAngle) * textRadius;

        ctx.font = 'bold 12px Arial'; // Adjusted font size
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Slightly transparent white for better readability
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Simple shadow for better contrast on various colors
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(`${Math.round(segmentScore * 10)}%`, textX, textY);
        ctx.shadowColor = 'transparent'; // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

      }
    });

    // Grid lines
    for (let i = 1; i <= 10; i++) {
      const radius = innerRadius + (maxRadius - innerRadius) * (i / 10);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = i % 2 === 0 ? '#ccc' : '#e8e8e8'; // Alternating grid line style
      ctx.lineWidth = 0.75; // Thinner grid lines
      ctx.stroke();
    }

    // Radial lines
    segmentsToDraw.forEach((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX + Math.cos(angle) * innerRadius, centerY + Math.sin(angle) * innerRadius);
      ctx.lineTo(centerX + Math.cos(angle) * maxRadius, centerY + Math.sin(angle) * maxRadius);
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Center circle overlay
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#ccc'; // Slightly darker border for center
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [wheelData, showSubcategories, size, showLabels, showPercentages]); // Added wheelData to dependencies

  const handleMouseMove = (e) => {
    if (!interactive || !canvasRef.current || !wheelData || !wheelData.areas) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    const centerX = size / 2;
    const centerY = size / 2;
    const dx = canvasX - centerX;
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    const maxRadius = size / 2 - (showLabels ? 50 : 20);
    const innerRadius = Math.min(40, maxRadius * 0.2);

    if (distance < innerRadius || distance > maxRadius) {
      if (tooltip.visible) setTooltip({ visible: false });
      return;
    }
    
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    
    let segmentsForTooltip = [];
    if (showSubcategories) {
      wheelData.areas.forEach(area => {
        if (area.subcategories && area.subcategories.length > 0) {
          area.subcategories.forEach(sub => {
            segmentsForTooltip.push({
              name: sub.name,
              score: sub.score || 0,
              parentArea: area.name,
              color: area.color
            });
          });
        }
      });
    } else {
      segmentsForTooltip = wheelData.areas.map(area => ({
        name: area.name,
        score: area.score || 0,
        color: area.color
      }));
    }

    if (segmentsForTooltip.length === 0) {
        if (tooltip.visible) setTooltip({ visible: false });
        return;
    }

    const segmentIndex = Math.floor(angle / (2 * Math.PI / segmentsForTooltip.length));
    const segment = segmentsForTooltip[segmentIndex];
    
    if (segment) {
      const scorePercentage = Math.round((segment.score || 0) * 10);
      const tooltipText = showSubcategories && segment.parentArea
        ? `${segment.parentArea} - ${segment.name}: ${scorePercentage}%`
        : `${segment.name}: ${scorePercentage}%`;
      
      // Position tooltip slightly above the cursor
      setTooltip({
        visible: true,
        x: x, // Use original clientX relative to canvas for positioning
        y: y - 10, // Offset to appear above the cursor
        text: tooltipText
      });
    } else {
      if (tooltip.visible) setTooltip({ visible: false });
    }
  };
  
  const handleMouseLeave = () => {
    if (tooltip.visible) setTooltip({ visible: false });
  };
  
  return (
    <WheelContainer>
      <Canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseMove={interactive ? handleMouseMove : undefined}
        onMouseLeave={interactive ? handleMouseLeave : undefined}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
      />
      <WheelInfo>
        <CenterCircle>
          {overallScore}%
        </CenterCircle>
      </WheelInfo>
      {interactive && tooltip.visible && (
        <Tooltip
          visible={tooltip.visible}
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </Tooltip>
      )}
    </WheelContainer>
  );
};

export default WheelDiagram;
