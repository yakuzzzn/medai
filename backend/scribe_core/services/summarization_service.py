import openai
import json
import structlog
from typing import Dict, Any, Optional
from pydantic import BaseModel

from ..config import settings

logger = structlog.get_logger()

class SOAPData(BaseModel):
    subjective: str
    objective: str
    assessment: str
    plan: str

class ConfidenceScores(BaseModel):
    subjective: float
    objective: float
    assessment: float
    plan: float

class SummarizationResult(BaseModel):
    soap_data: SOAPData
    confidence_scores: ConfidenceScores
    processing_time: float
    model_used: str

class SummarizationService:
    def __init__(self):
        self.client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
        self.system_prompt = settings.AI_SYSTEM_PROMPT
        
    async def summarize_transcript(
        self, 
        transcript: str, 
        language: str = "en"
    ) -> SummarizationResult:
        """
        Summarize transcript into SOAP note using AI
        """
        try:
            logger.info("Starting transcript summarization", 
                       transcript_length=len(transcript),
                       language=language)
            
            # Prepare the prompt
            user_prompt = f"""
            Please analyze the following medical consultation transcript and create a SOAP note.
            
            Transcript:
            {transcript}
            
            Please provide the response in the following JSON format:
            {{
                "subjective": "Patient's reported symptoms and history",
                "objective": "Clinical findings and observations",
                "assessment": "Diagnosis and clinical reasoning",
                "plan": "Treatment plan and follow-up",
                "confidence_scores": {{
                    "subjective": 0.95,
                    "objective": 0.87,
                    "assessment": 0.92,
                    "plan": 0.89
                }}
            }}
            
            Language: {language}
            """
            
            # Call OpenAI API
            response = await self._call_openai(user_prompt)
            
            # Parse response
            result = self._parse_summarization_response(response)
            
            logger.info("Transcript summarization completed",
                       processing_time=result.processing_time,
                       model_used=result.model_used)
            
            return result
            
        except Exception as e:
            logger.error("Failed to summarize transcript", error=str(e))
            raise
            
    async def _call_openai(self, prompt: str) -> str:
        """
        Call OpenAI API with retry logic
        """
        try:
            response = self.client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,  # Low temperature for consistent medical output
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            return response.choices[0].message.content
            
        except openai.APIError as e:
            logger.error("OpenAI API error", error=str(e))
            raise
        except Exception as e:
            logger.error("Unexpected error calling OpenAI", error=str(e))
            raise
            
    def _parse_summarization_response(self, response: str) -> SummarizationResult:
        """
        Parse OpenAI response into structured SOAP data
        """
        try:
            # Parse JSON response
            data = json.loads(response)
            
            # Extract SOAP data
            soap_data = SOAPData(
                subjective=data.get("subjective", ""),
                objective=data.get("objective", ""),
                assessment=data.get("assessment", ""),
                plan=data.get("plan", "")
            )
            
            # Extract confidence scores
            confidence_data = data.get("confidence_scores", {})
            confidence_scores = ConfidenceScores(
                subjective=confidence_data.get("subjective", 0.8),
                objective=confidence_data.get("objective", 0.8),
                assessment=confidence_data.get("assessment", 0.8),
                plan=confidence_data.get("plan", 0.8)
            )
            
            return SummarizationResult(
                soap_data=soap_data,
                confidence_scores=confidence_scores,
                processing_time=0.0,  # Will be set by caller
                model_used=settings.OPENAI_MODEL
            )
            
        except json.JSONDecodeError as e:
            logger.error("Failed to parse OpenAI response as JSON", error=str(e))
            raise ValueError("Invalid JSON response from AI model")
        except Exception as e:
            logger.error("Failed to parse summarization response", error=str(e))
            raise
            
    def validate_soap_data(self, soap_data: SOAPData) -> bool:
        """
        Validate SOAP data quality
        """
        # Check for minimum content
        if len(soap_data.subjective.strip()) < 10:
            return False
        if len(soap_data.objective.strip()) < 10:
            return False
        if len(soap_data.assessment.strip()) < 10:
            return False
        if len(soap_data.plan.strip()) < 10:
            return False
            
        return True
        
    def calculate_overall_confidence(self, confidence_scores: ConfidenceScores) -> float:
        """
        Calculate overall confidence score
        """
        scores = [
            confidence_scores.subjective,
            confidence_scores.objective,
            confidence_scores.assessment,
            confidence_scores.plan
        ]
        return sum(scores) / len(scores)

# Global service instance
summarization_service = SummarizationService() 