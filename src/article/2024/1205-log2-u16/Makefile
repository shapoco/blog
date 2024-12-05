.PHONY: all build run clean

BIN := a.out
CXX := g++

ERROR_ALL_CSV = error_all.csv
ERROR_DIST_CSV = error_dist.csv
SUMMARY_LOG = summary.log

EXTRA_DEPENDENCIES = \
	Makefile

SRC_FILES = \
	$(wildcard *.cpp)

OUT_FILES = \
	$(ERROR_ALL_CSV) \
	$(ERROR_DIST_CSV) \
	$(SUMMARY_LOG)

all: $(SUMMARY_LOG) $(EXTRA_DEPENDENCIES)

run: $(SUMMARY_LOG) $(EXTRA_DEPENDENCIES)

build: $(BIN) $(EXTRA_DEPENDENCIES)

$(SUMMARY_LOG): $(BIN) $(EXTRA_DEPENDENCIES)
	./$(BIN)

$(BIN): $(SRC_FILES) $(EXTRA_DEPENDENCIES)
	$(CXX) $(SRC_FILES) -o $@

clean:
	rm -rf $(BIN)
	rm -rf *.log *.csv
