.PHONY: all usage

DIR_SRC = article
DIR_OUT = ../docs
DIR_TEPMPLATE = template
DIR_TEPMPLATE_ARTICLE = $(DIR_TEPMPLATE)/yyyy/mmdd-title

ARTICLE_MD = article.md
TEMPLATE_HTML = $(DIR_TEPMPLATE_ARTICLE)/article.html

MDS = $(wildcard $(DIR_SRC)/*/*/$(ARTICLE_MD))
HTMLS = $(patsubst $(DIR_SRC)/%,$(DIR_OUT)/%,$(patsubst %/$(ARTICLE_MD),%/index.html,$(MDS)))

EXTRA_DEPENDENCIES = \
	$(wildcard *.py) \
	$(wildcard $(DIR_TEPMPLATE)/*.*) \
	$(wildcard $(DIR_TEPMPLATE_ARTICLE)/*.*) \
	Makefile

all: $(HTMLS)

$(DIR_OUT)/%/index.html: $(DIR_SRC)/%/* $(EXTRA_DEPENDENCIES)
	mkdir -p $(shell dirname $@)
	rm -rf $(shell dirname $@)/*
	./build_article.py \
		-i $(shell dirname $<) \
		-o $(shell dirname $@) \
		-t $(TEMPLATE_HTML)
	du -sh $(shell dirname $@)

usage:
	du -sh ../docs/*/*
