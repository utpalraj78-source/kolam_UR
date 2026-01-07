# Kolam 6G Lab - Kernel Build System
# Usage: 
#   make all      - Build all kernels
#   make clean    - Remove build artifacts

CXX = g++
CXXFLAGS = -shared -fPIC -O3
AVX_FLAGS = -mavx2 -mfma
KERNEL_DIR = backend/cpp_kernels

# Detect OS
ifeq ($(OS),Windows_NT)
	EXT = dll
	RM = del /Q
else
	EXT = so
	RM = rm -f
endif

all: $(KERNEL_DIR)/kolam_engine.$(EXT) $(KERNEL_DIR)/kolam_kernel.$(EXT)

$(KERNEL_DIR)/kolam_engine.$(EXT): $(KERNEL_DIR)/kolam_engine.cpp
	$(CXX) $(CXXFLAGS) $(AVX_FLAGS) -o $@ $<

$(KERNEL_DIR)/kolam_kernel.$(EXT): $(KERNEL_DIR)/kolam_kernel.cpp
	$(CXX) $(CXXFLAGS) -o $@ $<

clean:
	$(RM) $(KERNEL_DIR)/*.dll $(KERNEL_DIR)/*.so $(KERNEL_DIR)/*.o
