// Create our Application
App = Ember.Application.create({});

// Our RedditLink model
App.RedditLink = Ember.Object.extend({

  /*
    It seems reddit will return the string 'default' when there's no thumbnail present.
    This computed property will convert 'default' to null to avoid rendering a broken
    image link.
  */
  thumbnailUrl: function() {
    var thumbnail = this.get('thumbnail');
    return (thumbnail === 'default') ? null : thumbnail;
  }.property('thumbnail'),

});

App.RedditLink.reopenClass({

  /* Use the Reddit JSON API to retrieve a list of links within a subreddit. Returns
     a promise that will resolve to an array of `App.RedditLink` objects */
  findAll: function(subreddit) {
    return $.getJSON("http://www.reddit.com/r/" + subreddit + "/.json?jsonp=?").then(function(response) {
      var links = [];
      response.data.children.forEach(function (child) {
        links.push(App.RedditLink.create(child.data));
      });
      return links;
    });
  }

});

// Our default route. Just show a list of the links in /r/aww
App.IndexRoute = Ember.Route.extend({
  model: function() {
    return App.RedditLink.findAll('aww');
  }
});