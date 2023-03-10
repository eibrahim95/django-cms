/*##################################################|*/
/* #CMS# */
(function($) {
// CMS.$ will be passed for $
$(document).ready(function () {
	/*!
	 * Toolbar
	 * Handles all features related to the toolbar
	 */
	CMS.Toolbar = new CMS.Class({

		implement: [CMS.API.Helpers],

		options: {
			'preventSwitch': false,
			'preventSwitchMessage': 'Switching is disabled.',
			'messageDelay': 2000
		},

		initialize: function (options) {
			this.container = $('#cms_toolbar');
			this.options = $.extend(true, {}, this.options, options);
			this.config = CMS.config;
			this.settings = this.getSettings();
			// class variables
			this.toolbar = this.container.find('.cms_toolbar');
			this.toolbar.hide();
			this.toolbarTrigger = this.container.find('.cms_toolbar-trigger');

			this.navigations = this.container.find('.cms_toolbar-item-navigation');
			this.buttons = this.container.find('.cms_toolbar-item-buttons');
			this.modes = this.container.find('.cms_toolbar-item-cms-mode-switcher a');
			this.switcher = this.container.find('.cms_toolbar-item_switch');

			this.body = $('html');
			this.messages = this.container.find('.cms_messages');
			this.bars = $('.cms_placeholder-bar');
			this.click = (document.ontouchstart !== null) ? 'click.cms' : 'touchend.cms';

			this.plugins = $('.cms_plugin');
			this.placeholders = $('.cms_placeholder');

			this.lockToolbar = false;
			this.timer = function () {};

			// setup initial stuff
			this._setup();

			// setup events
			this._events();
		},

		// initial methods
		_setup: function () {
			// setup toolbar visibility, we need to reverse the options to set the correct state
			(this.settings.toolbar === 'expanded') ? this._showToolbar(0, true) : this._hideToolbar(0, true);
			// setup toolbar mode
			(this.settings.mode === 'drag') ? this._enableDragMode(300, true) : this._enableEditMode(300, true);

			// check if modes should be visible
			if($('.cms_placeholder-bar').length) {
				this.container.find('.cms_toolbar-item-cms-mode-switcher').show();
			}

			// hide publish button
			var publishBtn = $('.cms_btn-publish').parent();
				publishBtn.hide();
			if($('.cms_btn-publish-active').length) publishBtn.show();

			// add toolbar ready class to body
			$('body').addClass('cms_toolbar-ready');

			// check if we need to reset the current settings depending on a new release
			if(CMS.config.settings.version !== this.getSettings().version) {
				this.setSettings(CMS.config.settings);
				this.reloadBrowser();
			}

			// check if debug is true
			if(CMS.config.debug) this._debug();

			// check if there are messages and display them
			if(CMS.config.messages) this.openMessage(CMS.config.messages);

			// enforce open state if user is not logged in but requests the toolbar
			if(!CMS.config.auth) this.toggleToolbar(true);

			// should switcher indicate that there is an unpublished page?
			if(CMS.config.publisher) {
				this.openMessage(CMS.config.publisher, 'right');
				setInterval(function () { CMS.$('.cms_toolbar-item_switch').toggleClass('cms_toolbar-item_switch-highlight'); }, 2000);
			}

			// open sideframe if it was previously opened
			if(this.settings.sideframe.url) {
				var sideframe = new CMS.Sideframe();
					sideframe.open(this.settings.sideframe.url, false);
			}
		},

		_events: function () {
			var that = this;

			// attach event to the trigger handler
			this.toolbarTrigger.bind(this.click, function (e) {
				e.preventDefault();
				that.toggleToolbar();
			});

			// attach event to the navigation elements
			this.navigations.each(function () {
				var item = $(this);
				var lists = item.find('li');
				var root = 'cms_toolbar-item-navigation';
				var hover = 'cms_toolbar-item-navigation-hover';
				var disabled = 'cms_toolbar-item-navigation-disabled';
				var children = 'cms_toolbar-item-navigation-children';

				// remove events from first level
				item.find('a').bind(that.click, function (e) {
					e.preventDefault();
					if($(this).attr('href') !== ''
						&& $(this).attr('href') !== '#'
						&& !$(this).parent().hasClass(disabled)
						&& !$(this).parent().hasClass(disabled)) {
						that._delegate($(this));
						reset();
						return false;
					}
				});

				// handle click states
				lists.bind(that.click, function (e) {
					e.stopPropagation();
					var el = $(this);

					// close if el is first item
					if(el.parent().hasClass(root) && el.hasClass(hover) || el.hasClass(disabled)) {
						reset();
						return false;
					} else {
						reset();
						el.addClass(hover);
					}

					// activate hover selection
					item.find('> li').bind('mouseenter', function () {
						// cancel if item is already active
						if($(this).hasClass(hover)) return false;
						$(this).trigger(that.click);
					});

					// create the document event
					$(document).bind(that.click, reset);
				});

				// attach hover
				lists.find('li').bind('mouseenter mouseleave', function () {
					// reset
					lists.find('li').removeClass(hover);

					var el = $(this);
					var parent = el.closest('.cms_toolbar-item-navigation-children');
					var hasChildren = el.hasClass(children) || parent.length;

					// do not attach hover effect if disabled
					if(el.hasClass(disabled)) return false;

					// add hover effect
					el.addClass(hover);

					// handle children elements
					if(hasChildren) {
						el.find('> ul').show();
						// add parent class
						parent.addClass(hover);
					} else {
						lists.find('ul ul').hide();
					}
				});

				// fix leave event
				lists.find('> ul').bind('mouseleave', function () {
					lists.find('li').removeClass(hover);
				});

				// removes classes and events
				function reset() {
					lists.removeClass(hover);
					lists.find('ul ul').hide();
					item.find('> li').unbind('mouseenter');
					$(document).unbind(that.click);
				}
			});

			// attach event to the switcher elements
			this.switcher.each(function () {
				$(this).bind(that.click, function (e) {
					e.preventDefault();
					that._setSwitcher($(e.currentTarget));
				});
			});

			this.modes.eq(0).bind(this.click, function (e) {
				e.preventDefault();
				that._enableEditMode(300);
			});
			this.modes.eq(1).bind(this.click, function (e) {
				e.preventDefault();
				that._enableDragMode(300);
			});

			// keyboard handling
			$(document).bind('keydown', function (e) {
				// check if we have an important focus
				var fields = $('*:focus');
				// 32 = space
				if(e.keyCode === 32 && that.settings.mode === 'drag' && !fields.length) {
					e.preventDefault();
					that._enableEditMode(300);
				} else if(e.keyCode === 32 && that.settings.mode === 'edit' && !fields.length) {
					e.preventDefault();
					that._enableDragMode(300);
				}
			});
		},

		// public methods
		toggleToolbar: function (show)??{
			// overwrite state when provided
			if(show) this.settings.toolbar = 'collapsed';
			// toggle bar
			(this.settings.toolbar === 'collapsed') ? this._showToolbar(200) : this._hideToolbar(200);
		},

		openMessage: function (msg, dir, delay, error) {
			// set toolbar freeze
			this._lockToolbar(true);

			// add content to element
			this.messages.find('.cms_messages-inner').html(msg);

			// clear timeout
			clearTimeout(this.timer);

			// determine width
			var that = this;
			var width = 320;
			var height = this.messages.outerHeight(true);
			var top = this.toolbar.outerHeight(true);
			var close = this.messages.find('.cms_messages-close');
				close.hide();
				close.bind(this.click, function () {
					that.closeMessage();
				});

			// set top to 0 if toolbar is collapsed
			if(this.settings.toolbar === 'collapsed') top = 0;

			// do we need to add debug styles?
			if(this.config.debug) top = top + 5;

			// set correct position and show
			this.messages.css('top', -height).show();

			// error handling
			this.messages.removeClass('cms_messages-error');
			if(error) this.messages.addClass('cms_messages-error');

			// dir should be left, center, right
			dir = dir || 'center';
			// set correct direction and animation
			switch(dir) {
				case 'left':
					this.messages.css({
						'top': top,
						'left': -width,
						'right': 'auto',
						'margin-left': 0
					});
					this.messages.animate({ 'left': 0 });
					break;
				case 'right':
					this.messages.css({
						'top': top,
						'right': -width,
						'left': 'auto',
						'margin-left': 0
					});
					this.messages.animate({ 'right': 0 });
					break;
				default:
					this.messages.css({
						'left': '50%',
						'right': 'auto',
						'margin-left': -(width / 2)
					});
					this.messages.animate({ 'top': top });
			}

			// cancel autohide if delay is 0
			if(delay === 0) {
				close.show();
				return false
			}
			// add delay to hide
			this.timer = setTimeout(function () {
				that.closeMessage();
			}, delay || this.options.messageDelay);
		},

		closeMessage: function () {
			this.messages.fadeOut(300);
			// unlock toolbar
			this._lockToolbar(false);
		},

		openAjax: function (url, post, text) {
			var that = this;

			// check if we have a confirmation text
			var question = (text) ? confirm(text) : true;
			// cancel if question has been denied
			if(!question) return false;

			$.ajax({
				'type': 'POST',
				'url': url,
				'data': (post) ? JSON.parse(post) : {},
				'success': function () {
					CMS.API.Helpers.reloadBrowser();
				},
				'error': function (jqXHR) {
					that.showError(jqXHR.response + ' | ' + jqXHR.status + ' ' + jqXHR.statusText);
				}
			});
		},

		showError: function (msg) {
			this.openMessage(msg, 'center', this.options.messageDelay, true);
		},

		// private methods
		_showToolbar: function (speed, init) {
			this.toolbarTrigger.addClass('cms_toolbar-trigger-expanded');
			this.toolbar.slideDown(speed);
			// animate html
			this.body.animate({ 'margin-top': (this.config.debug) ? 35 : 30 }, (init) ? 0 : speed);
			// set messages top to toolbar height
			this.messages.css('top', 31);
			// set new settings
			this.settings.toolbar = 'expanded';
			if(!init) this.setSettings(this.settings);
		},

		_hideToolbar: function (speed, init) {
			// cancel if sideframe is active
			if(this.lockToolbar) return false;

			this.toolbarTrigger.removeClass('cms_toolbar-trigger-expanded');
			this.toolbar.slideUp(speed);
			// animate html
			this.body.animate({ 'margin-top': (this.config.debug) ? 5 : 0 }, speed);
			// set messages top to 0
			this.messages.css('top', 0);
			// set new settings
			this.settings.toolbar = 'collapsed';
			if(!init) this.setSettings(this.settings);
		},

		_enableEditMode: function (speed, init) {
			this.bars.hide();
			this.plugins.stop(true, true).fadeIn(speed);
			this.placeholders.hide();

			// set active item
			this.modes.removeClass('cms_btn-active').eq(0).addClass('cms_btn-active');
			this.settings.mode = 'edit';

			// hide clipboard if in edit mode
			this.container.find('.cms_clipboard').hide();

			if(!init) this.setSettings(this.settings);
		},

		_enableDragMode: function (speed, init) {
			this.bars.fadeIn(speed);
			this.plugins.hide();
			this.placeholders.stop(true, true).fadeIn(speed);

			// set active item
			this.modes.removeClass('cms_btn-active').eq(1).addClass('cms_btn-active');
			this.settings.mode = 'drag';

			// show clipboard in build mode
			this.container.find('.cms_clipboard').fadeIn(speed);

			if(!init) this.setSettings(this.settings);
		},

		_setSwitcher: function (el) {
			// save local vars
			var active = el.hasClass('cms_toolbar-item_switch-active');
			var anchor = el.find('a');
			var knob = el.find('.cms_toolbar-item_switch-knob');
			var duration = 300;

			// prevent if switchopstion is passed
			if(this.options.preventSwitch) {
				this.openMessage(this.options.preventSwitchMessage, 'right');
				return false;
			}

			// determin what to trigger
			if(active) {
				knob.animate({
					'right': anchor.outerWidth(true) - (knob.outerWidth(true) + 2)
				}, duration);
				// move anchor behind the knob
				anchor.css('z-index', 1).animate({
					'padding-top': 6,
					'padding-right': 14,
					'padding-bottom': 4,
					'padding-left': 28
				}, duration);
			} else {
				knob.animate({
					'left': anchor.outerWidth(true) - (knob.outerWidth(true) + 2)
				}, duration);
				// move anchor behind the knob
				anchor.css('z-index', 1).animate({
					'padding-top': 6,
					'padding-right': 28,
					'padding-bottom': 4,
					'padding-left': 14
				}, duration);
			}

			// reload
			setTimeout(function () {
				window.location.href = anchor.attr('href');
			}, duration);
		},

		_delegate: function (el) {
			// save local vars
			var target = el.attr('data-rel');

			switch(target) {
				case 'modal':
					var modal = new CMS.Modal();
						modal.open(el.attr('href'), el.attr('data-name'));
					break;
				case 'message':
					this.openMessage(el.attr('data-text'));
					break;
				case 'sideframe':
					var sideframe = new CMS.Sideframe();
						sideframe.open(el.attr('href'), true);
					break;
				case 'ajax':
					this.openAjax(el.attr('href'), el.attr('data-post'), el.attr('data-text'));
					break;
				default:
					window.location.href = el.attr('href');
			}
		},

		_lockToolbar: function (lock) {
			if(lock) {
				this.lockToolbar = true;
				// make button look disabled
				this.toolbarTrigger.css('opacity', 0.2);
			} else {
				this.lockToolbar = false;
				// make button look disabled
				this.toolbarTrigger.css('opacity', 1);
			}
		},

		_loader: function (loader) {
			if(loader) {
				this.toolbarTrigger.addClass('cms_toolbar-loader');
			} else {
				this.toolbarTrigger.removeClass('cms_toolbar-loader');
			}
		},

		_debug: function () {
			var that = this;
			var timeout = 1000;
			var timer = function () {};

			// bind message event
			var debug = this.container.find('.cms_debug-bar');
				debug.bind('mouseenter mouseleave', function (e) {
					clearTimeout(timer);

					if(e.type === 'mouseenter') {
						timer = setTimeout(function () {
							that.openMessage(that.config.lang.debug);
						}, timeout);
					}
				});
		}

	});

});
})(CMS.$);