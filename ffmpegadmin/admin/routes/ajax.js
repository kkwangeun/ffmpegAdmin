var express = require('express');
var router = express.Router();




/* POST 호출 처리 */
router.post('/', function(req, res, next) {
    console.log('POST 방식으로 서버 호출됨');

    var msg_str = req.body.message;
    //msg = '[에코]' + msg;
    console.log(msg_str);
    res.send({result:true, msg:msg_str});
});

module.exports = router;
