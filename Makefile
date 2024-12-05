.PHONY: all index size install-stamp redirect-pages

DIR_REPO = $(shell pwd)

DIR_SRC = src
DIR_OUT = docs
DIR_BIN = bin

DIR_ARTICLE = $(DIR_SRC)/article
DIR_TEPMPLATE = $(DIR_SRC)/template
DIR_TEPMPLATE_ARTICLE = $(DIR_TEPMPLATE)/yyyy/mmdd-title

ARTICLE_MD = article.md
TEMPLATE_HTML = $(DIR_TEPMPLATE_ARTICLE)/article.html
INDEX_JSON = $(DIR_OUT)/index.json
INDEX_HTML = $(DIR_OUT)/index.html

MDS = $(wildcard $(DIR_ARTICLE)/*/*/$(ARTICLE_MD))
HTMLS = $(patsubst $(DIR_ARTICLE)/%,$(DIR_OUT)/%,$(patsubst %/$(ARTICLE_MD),%/index.html,$(MDS)))

COMMON_EXTRA_DEPENDENCIES = \
	$(wildcard $(DIR_BIN)/*.py) \
	Makefile

INDEX_EXTRA_DEPENDENCIES = \
	$(COMMON_EXTRA_DEPENDENCIES)

TEMPLATE_DEPENDENCIES = \
	$(COMMON_EXTRA_DEPENDENCIES) \
	$(wildcard $(DIR_OUT)/*.js) \
	$(wildcard $(DIR_OUT)/*.json) \
	$(wildcard $(DIR_OUT)/*.css) \

ARTICLE_EXTRA_DEPENDENCIES = \
	$(COMMON_EXTRA_DEPENDENCIES) \
	$(TEMPLATE_DEPENDENCIES) \
	$(wildcard $(DIR_BIN)/*.py) \
	$(wildcard $(DIR_TEPMPLATE)/*.*) \
	$(wildcard $(DIR_TEPMPLATE_ARTICLE)/*.*)

all: $(INDEX_JSON) $(HTMLS) $(INDEX_HTML)

index: $(INDEX_JSON) $(INDEX_HTML)

$(INDEX_JSON): $(MDS) $(INDEX_EXTRA_DEPENDENCIES)
	@echo "Updating: $@"
	@$(DIR_BIN)/gen_index.py -o $@.tmp
	@if diff $@ $@.tmp > /dev/null ; then \
		echo "*INFO: Index not changed." ; \
	else \
		cp -f $@.tmp $@ ; \
	fi ; \
	rm -f $@.tmp

$(DIR_OUT)/%/index.html: $(DIR_ARTICLE)/%/* $(ARTICLE_EXTRA_DEPENDENCIES)
	@echo "Generating: $@"
	@if [ -e "$(shell dirname $<)/Makefile" ] ; then \
		make -C $(shell dirname $<) ; \
	fi
	@$(DIR_BIN)/update_code_block.py -f $(shell dirname $<)/$(ARTICLE_MD)
	@mkdir -p $(shell dirname $@)
	@rm -rf $(shell dirname $@)/*
	@$(DIR_BIN)/build_article.py \
		-i $(shell dirname $<) \
		-o $(shell dirname $@) \
		-t $(TEMPLATE_HTML)
	@$(DIR_BIN)/update_url_postfix.py -d "docs/" -f $@

$(TEMPLATE_HTML): $(TEMPLATE_DEPENDENCIES)
	@echo "Updating: $@"
	@$(DIR_BIN)/update_url_postfix.py -d "docs/" -f $@

$(INDEX_HTML): $(TEMPLATE_DEPENDENCIES)
	@echo "Updating: $@"
	@$(DIR_BIN)/update_url_postfix.py -d "docs/" -f $@

size:
	@du -sh $(DIR_OUT)/*/*/
	@du -sh $(DIR_OUT)/*/
	@du -sh $(DIR_OUT)/

install-stamp:
	cd ../stamps-php/ &&\
	./install_widget.sh \
		-t '$(DIR_REPO)/docs/stamp' \
		-d '$(DIR_REPO)/src/template'

redirect-pages:
	$(DIR_BIN)/gen_redirect_pages.py \
		-t '$(DIR_TEPMPLATE)/yyyy/mm/redirect.html' \
		-o '$(DIR_OUT)'
