// Test-only event publisher; authorization required.
module.exports = (req,res) => res.status(501).json({error:'Not configured'});
