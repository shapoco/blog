.PHONY: all size install-stamp

DIR_REPO = $(shell pwd)

DIR_SRC = src
DIR_OUT = docs
DIR_BIN = bin

DIR_ARTICLE = $(DIR_SRC)/article
DIR_TEPMPLATE = $(DIR_SRC)/template
DIR_TEPMPLATE_ARTICLE = $(DIR_TEPMPLATE)/yyyy/mmdd-title

ARTICLE_MD = article.md
TEMPLATE_HTML = $(DIR_TEPMPLATE_ARTICLE)/article.html

MDS = $(wildcard $(DIR_ARTICLE)/*/*/$(ARTICLE_MD))
HTMLS = $(patsubst $(DIR_ARTICLE)/%,$(DIR_OUT)/%,$(patsubst %/$(ARTICLE_MD),%/index.html,$(MDS)))

EXTRA_DEPENDENCIES = \
	$(wildcard $(DIR_BIN)/*.py) \
	$(wildcard $(DIR_OUT)/*.js) \
	$(wildcard $(DIR_OUT)/*.css) \
	$(wildcard $(DIR_TEPMPLATE)/*.*) \
	$(wildcard $(DIR_TEPMPLATE_ARTICLE)/*.*) \
	Makefile

all: $(HTMLS)

$(DIR_OUT)/%/index.html: $(DIR_ARTICLE)/%/* $(EXTRA_DEPENDENCIES)
	@mkdir -p $(shell dirname $@)
	@rm -rf $(shell dirname $@)/*
	@$(DIR_BIN)/build_article.py -i $(shell dirname $<) -o $(shell dirname $@) -t $(TEMPLATE_HTML)
	@du -sh $(shell dirname $@)

size:
	@du -sh $(DIR_OUT)/*/*/
	@du -sh $(DIR_OUT)/*/
	@du -sh $(DIR_OUT)/

install-stamp:
	cd ../stamps-php/ &&\
	./install_widget.sh \
		-t '$(DIR_REPO)/docs/stamp' \
		-d '$(DIR_REPO)/src/template'
