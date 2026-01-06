
import json
import os

CONFIG_FILE = "backend/model_params.json"

# Default values
DEFAULT_PARAMS = {
    "USER_INT_POWER": 0.50,
    "JAMMER_INT_POWER": 2.00,
    "SIGNAL_POWER": 1.0
}

class SimulationConfig:
    def __init__(self):
        self.params = DEFAULT_PARAMS.copy()
        self.load()

    def load(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r") as f:
                    data = json.load(f)
                    self.params.update(data)
            except Exception as e:
                print(f"Failed to load config: {e}")

    def save(self):
        try:
            with open(CONFIG_FILE, "w") as f:
                json.dump(self.params, f, indent=2)
        except Exception as e:
            print(f"Failed to save config: {e}")

    def get(self, key):
        return self.params.get(key, DEFAULT_PARAMS.get(key))

    def update(self, key, value):
        self.params[key] = value
        self.save()

# Global instance
sim_config = SimulationConfig()
