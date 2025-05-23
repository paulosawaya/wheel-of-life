// frontend/src/components/LoadingSpinner.js
import React from 'react';
import styled, { keyframes } from 'styled-components';

const spinAnimation = keyframes`
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: ${props => props.color || '#4ECDC4'}; // Using a common theme color from your app
`;

const SpinnerGraphic = styled.div`
    border: 3px solid rgba(0, 0, 0, 0.1); // A more neutral base color
    border-radius: 50%;
    border-top-color: ${props => props.color || '#4ECDC4'}; // Spinner color
    width: ${props => props.size || '30px'};
    height: ${props => props.size || '30px'};
    animation: ${spinAnimation} 0.8s linear infinite;
`;

const SpinnerText = styled.span`
    margin-top: 0.5rem;
    font-size: 0.9rem;
    color: ${props => props.textColor || '#333'};
`;

const LoadingSpinner = ({ message, size, color, textColor }) => {
    return (
    <SpinnerContainer color={color}>
        <SpinnerGraphic size={size} color={color} />
        {message && <SpinnerText textColor={textColor}>{message}</SpinnerText>}
    </SpinnerContainer>
    );
};

export default LoadingSpinner;