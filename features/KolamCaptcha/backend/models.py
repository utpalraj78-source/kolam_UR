from sqlalchemy import Column, Integer, String, DateTime, JSON
from datetime import datetime
from database import Base

class CaptchaChallenge(Base):
    __tablename__ = 'captcha_challenges'

    id = Column(Integer, primary_key=True, index=True)
    challenge_type = Column(String) # 'assembler' or 'completion'
    kolam_seed = Column(Integer)
    kolam_k = Column(Integer)
    
    # Store the solution. 
    # For Assembler: The correct permutation of quadrants [0,1,2,3]
    # For Completion: The index of the correct option [0..4]
    correct_solution = Column(JSON) 
    
    # For Completion Captcha: Store metadata about distractors if needed
    options = Column(JSON, nullable=True) 
    
    created_at = Column(DateTime, default=datetime.utcnow)
