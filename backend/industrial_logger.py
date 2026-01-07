import logging
import json
import time
from datetime import datetime

class IndustrialJsonFormatter(logging.Formatter):
    def format(self, record):
        log_record = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "module": record.module,
            "message": record.getMessage(),
            "service": "kolam-6g-core"
        }
        if hasattr(record, "telemetry"):
            log_record["telemetry"] = record.telemetry
        return json.dumps(log_record)

def setup_industrial_logger():
    logger = logging.getLogger("kolam_industrial")
    logger.setLevel(logging.INFO)
    
    # Console Handler for real-time monitoring
    ch = logging.StreamHandler()
    ch.setFormatter(IndustrialJsonFormatter())
    logger.addHandler(ch)
    
    # File Handler for long-term auditing
    fh = logging.FileHandler("kolam_production.log")
    fh.setFormatter(IndustrialJsonFormatter())
    logger.addHandler(fh)
    
    return logger

# Singleton instance
industrial_logger = setup_industrial_logger()
