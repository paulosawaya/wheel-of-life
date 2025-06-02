// src/components/WheelDiagram.js
import React, { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';

const WheelContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  margin: 2rem 0;
`;

const Canvas = styled.canvas`
  max-width: 100%;
  height: auto;
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
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 14px;
  pointer-events: none;
  z-index: 1000;
  white-space: nowrap;
  opacity: ${props => props.visible ? 1 : 0};
  transition: opacity 0.2s;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 5px solid rgba(0, 0, 0, 0.8);
  }
`;

const WheelDiagram = ({ 
  data = null, 
  showSubcategories = false,
  size = 400,
  interactive = true,
  showLabels = false,
  showPercentages = true
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, text: '' });
  const [overallScore, setOverallScore] = useState(0);

  // Default areas with their subcategories
  const defaultData = {
    areas: [
      {
        id: 1,
        name: 'Pessoal',
        color: '#5abc18',
        score: 0,
        subcategories: [
          { name: 'Saúde e disposição', score: 0 },
          { name: 'Desenvolvimento intelectual', score: 0 },
          { name: 'Equilíbrio emocional', score: 0 }
        ]
      },
      {
        id: 2,
        name: 'Qualidade de Vida',
        color: '#3ca0d4',
        score: 0,
        subcategories: [
          { name: 'Plenitude e felicidade', score: 0 },
          { name: 'Criatividade, hobbies e diversão', score: 0 },
          { name: 'Espiritualidade', score: 0 }
        ]
      },
      {
        id: 3,
        name: 'Profissional',
        color: '#d4b63c',
        score: 0,
        subcategories: [
          { name: 'Realização e propósito', score: 0 },
          { name: 'Recursos financeiros', score: 0 },
          { name: 'Contribuição social', score: 0 }
        ]
      },
      {
        id: 4,
        name: 'Relacionamentos',
        color: '#e64072',
        score: 0,
        subcategories: [
          { name: 'Família', score: 0 },
          { name: 'Desenvolvimento de emoções', score: 0 },
          { name: 'Vida social', score: 0 }
        ]
      }
    ]
  };

  // Merge data with defaults
  const wheelData = data || defaultData;
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 40;
    const innerRadius = 40;
    
    // Clear canvas
    ctx.clearRect(0, 0, size, size);
    
    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    
    let segments = [];
    
    if (showSubcategories && wheelData.areas) {
      // Show all 12 subcategories
      wheelData.areas.forEach(area => {
        area.subcategories?.forEach(sub => {
          segments.push({
            name: sub.name,
            score: sub.score || 0,
            color: area.color,
            parentArea: area.name
          });
        });
      });
    } else if (wheelData.areas) {
      // Show 4 main areas
      segments = wheelData.areas.map(area => ({
        name: area.name,
        score: area.score || 0,
        color: area.color
      }));
    } else if (Array.isArray(wheelData)) {
      // Legacy format support
      segments = wheelData.map(item => ({
        name: item.name,
        score: (item.percentage || 0) / 10,
        color: item.color
      }));
    }
    
    const angleStep = (2 * Math.PI) / segments.length;
    
    // Calculate overall score
    const avgScore = segments.reduce((sum, seg) => sum + seg.score, 0) / segments.length;
    setOverallScore(Math.round(avgScore * 10));
    
    // Draw segments
    segments.forEach((segment, index) => {
      const startAngle = index * angleStep - Math.PI / 2;
      const endAngle = (index + 1) * angleStep - Math.PI / 2;
      const scoreRadius = innerRadius + (maxRadius - innerRadius) * (segment.score / 10);
      
      // Draw background segment (light gray)
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = '#f0f0f0';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw filled segment based on score
      if (segment.score > 0) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, scoreRadius, startAngle, endAngle);
        ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = segment.color;
        ctx.globalAlpha = 0.8;
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // Draw labels
      if (showLabels) {
        const labelAngle = startAngle + angleStep / 2;
        const labelRadius = maxRadius + 20;
        const labelX = centerX + Math.cos(labelAngle) * labelRadius;
        const labelY = centerY + Math.sin(labelAngle) * labelRadius;
        
        ctx.save();
        ctx.translate(labelX, labelY);
        
        // Rotate text for better readability
        let rotation = labelAngle;
        if (labelAngle > Math.PI / 2 && labelAngle < 3 * Math.PI / 2) {
          rotation += Math.PI;
        }
        ctx.rotate(rotation);
        
        ctx.font = '12px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(segment.name, 0, 0);
        
        ctx.restore();
      }
      
      // Draw percentage in segment
      if (showPercentages && segment.score > 0) {
        const textAngle = startAngle + angleStep / 2;
        const textRadius = innerRadius + (scoreRadius - innerRadius) / 2;
        const textX = centerX + Math.cos(textAngle) * textRadius;
        const textY = centerY + Math.sin(textAngle) * textRadius;
        
        ctx.font = 'bold 14px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(segment.score * 10)}%`, textX, textY);
      }
    });
    
    // Draw grid lines
    for (let i = 1; i <= 10; i++) {
      const radius = innerRadius + (maxRadius - innerRadius) * (i / 10);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = i === 5 ? '#ccc' : '#eee';
      ctx.lineWidth = i === 5 ? 1.5 : 1;
      ctx.stroke();
    }
    
    // Draw radial lines
    segments.forEach((_, index) => {
      const angle = index * angleStep - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * innerRadius,
        centerY + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius,
        centerY + Math.sin(angle) * maxRadius
      );
      ctx.strokeStyle = '#ddd';
      ctx.lineWidth = 1;
      ctx.stroke();
    });
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.stroke();
    
  }, [wheelData, showSubcategories, size, showLabels, showPercentages]);
  
  const handleMouseMove = (e) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Scale coordinates to canvas size
    const scaleX = size / rect.width;
    const scaleY = size / rect.height;
    const canvasX = x * scaleX;
    const canvasY = y * scaleY;
    
    // Calculate angle and distance from center
    const centerX = size / 2;
    const centerY = size / 2;
    const dx = canvasX - centerX;
    const dy = canvasY - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Check if mouse is within wheel area
    if (distance < 40 || distance > size / 2 - 40) {
      setTooltip({ visible: false });
      return;
    }
    
    // Calculate which segment the mouse is over
    let angle = Math.atan2(dy, dx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    
    let segments = [];
    if (showSubcategories && wheelData.areas) {
      wheelData.areas.forEach(area => {
        area.subcategories?.forEach(sub => {
          segments.push({
            name: sub.name,
            score: sub.score || 0,
            parentArea: area.name
          });
        });
      });
    } else if (wheelData.areas) {
      segments = wheelData.areas.map(area => ({
        name: area.name,
        score: area.score || 0
      }));
    }
    
    const segmentIndex = Math.floor(angle / (2 * Math.PI / segments.length));
    const segment = segments[segmentIndex];
    
    if (segment) {
      const tooltipText = showSubcategories && segment.parentArea
        ? `${segment.parentArea} - ${segment.name}: ${Math.round(segment.score * 10)}%`
        : `${segment.name}: ${Math.round(segment.score * 10)}%`;
      
      setTooltip({
        visible: true,
        x: e.clientX - rect.left,
        y: e.clientY - rect.top - 30,
        text: tooltipText
      });
    }
  };
  
  const handleMouseLeave = () => {
    setTooltip({ visible: false });
  };
  
  return (
    <WheelContainer ref={containerRef}>
      <Canvas
        ref={canvasRef}
        width={size}
        height={size}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: interactive ? 'pointer' : 'default' }}
      />
      <WheelInfo>
        <CenterCircle>
          {overallScore}%
        </CenterCircle>
      </WheelInfo>
      {interactive && (
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
