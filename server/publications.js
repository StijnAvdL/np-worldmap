Meteor.publish('testTable', function(title) {
    return testTable.find({'title':title});
});