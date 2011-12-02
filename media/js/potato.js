
// Initialise page events

$(document).ready(function(){
    
    // Keep track of remaining characters for tweets
    track_remaining_characters($('#new_post_chars_remaining'), $('#new_post_tweet'));
    track_remaining_characters($('#new_comment_chars_remaining'), $('#new_comment_tweet'));
    
    // Activate twipsy tooltips
    $(".chars_remaining[rel=twipsy]").twipsy({
        live: true
    });
    
    // Listen for events to initialise edit and delete forms
    create_post_button_listeners();
    
    // Listen for form submissions
    create_submit_button_listeners();
    
    // Create the dynamic page elements (new_posts, new_comments, edited_posts, and deleted_posts)
    create_dynamic_page_elements();
    
});


// AJAX function below

function ajaxRequest(dynamic_page_object, url, method, data, onSuccess) {
    
    // this block is to ensure all PUT and DELETE actually get sent as POSTs
    if (method == 'POST') { data['method'] = 'POST'; }
    else if (method == 'PUT') { data['method'] = 'PUT'; method = 'POST'; }
    else if (method == 'DELETE') { data['method'] = 'DELETE'; method = 'POST'; }
    
    $.ajax({
        url: url,
        data: data,
        success: function (data) { onSuccess(dynamic_page_object, data); },
        type: method
    });
}


// A section containing the definition of Objects and methods to deal with
// the dynamic parts of the page

// Dictionary of settings for dynamic page elements
var dynamic_object_settings = {
    new_post: {
        api_method: 'POST',
        api_url: '/api/blog/post',
        modal_selector: '#modal-new_post'
    },
    new_comment: {
        api_method: 'POST',
        api_url: '/api/blog/comment',
        modal_selector: '#modal-new_comment'
    },
    delete_post: {
        api_method: 'DELETE',
        api_url: '/api/blog/post',
        modal_selector: '#modal-delete_post' //doesn't exist, deleting a post doesn't involve a modal dialogue
    },
    edit_post: {
        api_method: 'PUT',
        api_url: '/api/blog/post',
        modal_selector: '#modal-edit_post'
    }
};


// Definition of the Object for dynamic page elements
function Dynamic_page_element(opts) {
    this.api_method = opts['api_method'];
    this.api_url = opts['api_url'];
    this.modal_selector = $(opts['modal_selector']);
    this.fetch_content_method = 'GET';
    
    return true;
}

Dynamic_page_element.prototype.set_runtime_variables = function (form_selector) {
    // Some variables need to be initialise at runtime as they are not object specific, but instance specific
    this.form_selector = form_selector;
    this.api_data = this.form_selector.serializeObject();
    if ('id' in this.api_data) {
        this.existing_content_selector = $( '#' + this.api_data['id'] );
        this.fetch_content_url = '/post/' + this.api_data['id'] + '/content';
    }
    else if ('post_id' in this.api_data) {
        this.existing_content_selector = $( '#' + this.api_data['post_id'] );
        this.fetch_content_url = '/post/' + this.api_data['post_id'] + '/content';
    }   
    else {
        this.existing_content_selector = false;
        this.fetch_content_url = '/post/0/content';
    }
}

Dynamic_page_element.prototype.api_call = function () {
    ajaxRequest(this, this.api_url, this.api_method, this.api_data, this.refresh_page);
}

Dynamic_page_element.prototype.refresh_page = function(dynamic_page_object) {
    if (dynamic_page_object.modal_selector.length == 1) {
        dynamic_page_object.modal_selector.modal('hide');
        // empty form values now that form has successfully been submitted
        dynamic_page_object.modal_selector.find('textarea').val(''); // Probably need to check if submission passed server-side validation or not
    }
    // fetch new content to inject into the page
    ajaxRequest(dynamic_page_object, dynamic_page_object.fetch_content_url, dynamic_page_object.fetch_content_method, {}, dynamic_page_object.update_content);
}

Dynamic_page_element.prototype.update_content = function (dynamic_page_object, data) {
    // inject new content into page
    if ( dynamic_page_object.form_selector.attr('id') == 'new_post' ) {
        // When we add a new post we need to prepend it to the main_content div
        $('#main_content').prepend(data);
        $('#main_content').children().first().hide();
        $('#main_content').children().first().show('slow', 'swing', function() {
            create_post_button_listeners();
            create_submit_button_listeners();
        });
    }
    else if ( dynamic_page_object.form_selector.attr('id') == 'delete_post' ) {
        // When we delete a post we remove the div
        dynamic_page_object.existing_content_selector.hide('slow', 'swing', function() {
            dynamic_page_object.existing_content_selector.remove();
        });
    }
    else if ( dynamic_page_object.form_selector.attr('id') == 'edit_post' || dynamic_page_object.form_selector.attr('id') == 'new_comment' ) {
        dynamic_page_object.existing_content_selector.hide('slow', 'swing', function() {
            dynamic_page_object.existing_content_selector.replaceWith(function () {
                return $(data).hide().fadeIn('slow', 'swing', function() { // using fadeIn because for some reason show() doesn't work
                    create_post_button_listeners(); // need to put it in a callback so we are sure DOM is ready
                    create_submit_button_listeners();
                });
            });
        });
    }
    
    hide_spinner();
}

function create_dynamic_page_elements() {
    // Create the dynamic page elements from the above object definition
    new_post = new Dynamic_page_element(dynamic_object_settings['new_post']);
    new_comment = new Dynamic_page_element(dynamic_object_settings['new_comment']);
    delete_post = new Dynamic_page_element(dynamic_object_settings['delete_post']);
    edit_post = new Dynamic_page_element(dynamic_object_settings['edit_post']);
}

// Dictionary of functions to initiate API calls when a form submit is triggered
var api_calls = {
    new_post: function(form_selector) { new_post.set_runtime_variables(form_selector); new_post.api_call(); },
    new_comment: function(form_selector) { new_comment.set_runtime_variables(form_selector); new_comment.api_call(); },
    delete_post: function(form_selector) { delete_post.set_runtime_variables(form_selector); delete_post.api_call(); },
    edit_post: function(form_selector) { edit_post.set_runtime_variables(form_selector); edit_post.api_call(); }
};



// General functions

function hide_spinner() {
    $('#loading_spinner').css('visibility', 'hidden');
}

function create_submit_button_listeners() {
    // To save effort I just unbind all events and recreate new ones, rather than target specific elements
    $('form').unbind('submit');
    $('form').submit( function (e) {
        e.preventDefault();
        api_calls[ $(this).attr('id') ]( $(this) );
        $('#loading_spinner').css('visibility', 'visible');
    });
}

function create_post_button_listeners() {
    // To save effort I just unbind all events and recreate new ones, rather than target specific elements
    $('.edit_post_button').unbind('click');
    $('.edit_post_button').click( function() {
        $('#edit_post_title').val( $(this).parent().parent().find('.post_title').text() );
        $('#edit_post_body').val( $(this).parent().parent().parent().find('.post_body').text() );
        $('#edit_post_id').val( $(this).parent().parent().parent().attr('id') );
    });
    
    $('.add_comment_button').unbind('click');
    $('.add_comment_button').click( function() {
        $('#new_comment_post_title').val( $(this).parent().parent().find('.post_title').text() );
        $('#new_comment_post_id').val( $(this).parent().parent().attr('id') );
    });
}

function track_remaining_characters(character_tracker, tweetbox) {
    var onEditCallback = function(remaining){
        character_tracker.html(remaining);
        
        if(remaining > 0 && remaining != 140){
          character_tracker.removeClass('default success important');
          character_tracker.addClass('success');
        }
        else if(remaining == 140){
          character_tracker.removeClass('default success important');
          character_tracker.addClass('default');
        }
    }
    var onLimitCallback = function(){
        character_tracker.removeClass('default successimportant');
        character_tracker.addClass('important');
    }
  
    tweetbox.limitMaxlength({
        onEdit: onEditCallback,
        onLimit: onLimitCallback
    });
}



// Plugins


jQuery.fn.limitMaxlength = function(options){

  var settings = jQuery.extend({
    attribute: "maxlength",
    onLimit: function(){},
    onEdit: function(){}
  }, options);
  
  // Event handler to limit the textarea
  var onEdit = function(){
    var textarea = jQuery(this);
    var maxlength = parseInt(textarea.attr(settings.attribute));

    if(textarea.val().length > maxlength){
      textarea.val(textarea.val().substr(0, maxlength));
      
      // Call the onlimit handler within the scope of the textarea
      jQuery.proxy(settings.onLimit, this)();
    }
    
    // Call the onEdit handler within the scope of the textarea
    jQuery.proxy(settings.onEdit, this)(maxlength - textarea.val().length);
  }

  this.each(onEdit);

  return this.keyup(onEdit)
        .keydown(onEdit)
        .focus(onEdit);
}

$.fn.serializeObject = function()
{
    var o = {};
    var a = this.serializeArray();
    $.each(a, function() {
        if (o[this.name] !== undefined) {
            if (!o[this.name].push) {
                o[this.name] = [o[this.name]];
            }
            o[this.name].push(this.value || '');
        } else {
            o[this.name] = this.value || '';
        }
    });
    return o;
};

$.fn.spin = function(opts) {
  this.each(function() {
    var $this = $(this),
        data = $this.data();

    if (data.spinner) {
      data.spinner.stop();
      delete data.spinner;
    }
    if (opts !== false) {
      data.spinner = new Spinner($.extend({color: $this.css('color')}, opts)).spin(this);
    }
  });
  return this;
};