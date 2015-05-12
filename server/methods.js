Meteor.methods({
	readJsonCC: function() {
		return JSON.parse(Assets.getText("countryCode.json"));
	}
});
