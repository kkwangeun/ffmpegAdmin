
var ajax = require('./routes/ajax');
var cors = require('cors');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var exec = require('child_process').exec;
var cmd = require('node-cmd');
//async
var async = require('async');
var osutils = require('os-utils');
var osu = require('node-os-utils');
var cpu = osu.cpu;
var mem = osu.mem;
var netstat = osu.netstat;

//log
var fs = require('fs')
  , Log = require('log')
  , log = new Log('debug', fs.createWriteStream('my.log'));

var _SH_PATH_ = '/home/willfonk/service/ffmpegadmin/admin';
//channel_list
var channel_file = _SH_PATH_+'/channel_list.json';
var AllChannel_file = _SH_PATH_+'/AllChannel_list.json';
var json_fs = require('fs');

//app.use('/ajax',ajax);
//app.set('views', __dirname + '/views');
//app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/views'));

// channel
var channel_list = new Array();
var AllChannel_list = new Array();

// 서버 재기동시 자동으로 채널을 재시작
startFFmpegChannel();
// 서버 재기동시 자동으로 채널을 재시작
function startFFmpegChannel(){
  console.log("startFFmpegChannel start !!!");

  //AllChannel_list
  json_fs.readFile(AllChannel_file, 'utf8', function(err, data){
    var json_info = JSON.parse(data);
    var allChannel = json_info.AllChannel_list;
    console.log("AllChannel:" + allChannel);

    for(var i = 0; i < allChannel.length; i++){
      AllChannel_list.push(allChannel[i]);
    }
  });

  //channel_list
  json_fs.readFile(channel_file, 'utf8', function(err, data){
    var json_info = JSON.parse(data);
    var channel = json_info.channel_list;
    console.log("channel:" + channel);

    for(var i = 0; i < channel.length; i++){
      channel_list.push(channel[i]);
      //check channel
      var channel_id = channel[i];
      console.log("channel_id:" + channel_id );
      cmd.get(_SH_PATH_+"/checker.sh " + channel_id ,
        function (err, data, stderr){
          if(data > 0){
              console.log("data===>" + data);
          }
          else {
            console.log("start channel ==> " + data);
            cmd.get(_SH_PATH_+"/run.sh " + data, function (err, data, stderr){
              console.log(data);
            });
          }
      });
    }//end for
  });
};

var channelCheck = function(callback){
  for(var i = 0; i < channel_list.length; i++){
    var channel_id = channel_list[i];
    console.log("channel_id:" + channel_id );
    cmd.get(_SH_PATH_+"/checker.sh " + channel_id ,
      function (err, data, stderr){
        if(data > 0){
            console.log("data===>" + data);
        }
        else {
          console.log("start channel ==> " + data);
          cmd.get(_SH_PATH_+"/run.sh " + data, function (err, data, stderr){
            console.log(data);
          });
        }
    });
  }//end for
  callback();
}

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-")
  next();
});

app.get('/', function(req, res){
    res.send('hello world');
});

app.get('/API/test', function(req, res, next) {
    console.log('====== getServerStatus ========== ');
    //var msg_str = req.body.message;
    var msg_str = null;
    //msg = '[에코]' + msg;
    console.log("app.js message: " + msg_str);
    exec("ls", function (err, stdout, stderr){
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      msg_str = "test ok !!!!!";
      console.log(msg_str);
      if (err !== null) {
          console.log('error: ' + err);
      }

      var rlt = '{"cpu":100, "memory": "1024/6400", "network":150}';
      res.send(JSON.parse(rlt));
    });
});

// Checking to rtmp Source
app.get('/API/getSourceInfo', function(req, res, next){
  console.log('====== getSourceInfo =====');
  var channel_id = req.query.channel_id;

  cmd.get( "/usr/bin/timeout 3s ffprobe -v quiet -print_format json -show_streams rtmp://localhost/klive/"+channel_id , function(err, data, stderr){
    console.log(data);
    if(data == null || data == ""){
      data ='{"result":"error"}';
      res.send(JSON.parse(data));
    }else{
        res.send(data);
    }
  });
});


// return string
app.get('/API/getFFmpegProcess', function(req, res, next){
  console.log('====== getFFmpegProcess =====');
  cmd.get( "ps -ef | grep ffmpeg | grep -v ffmpegadmin | grep -v 'grep'" , function(err, data,stderr){
    console.log(data);
    res.send(data);
  });
});

app.get('/API/getChannelList', function(req, res, next) {
    console.log('====== getChannelList ========== ');
    var rlt = '{"channel_list":'+ JSON.stringify(channel_list) + '}';
    res.send(JSON.parse(rlt));
});

// async
app.get('/API/getServerStatus', function(req, res, next){
  console.log('====== getServerStatus =====');
  var serverInfo = {"cpu": null , "memory":null , "network": null};
  async.waterfall([
    function(callback){
       console.log("cpu");
       osutils.cpuUsage(function(v) {
         var cpuInfo = v * 100;
         console.log('CPU Usage (%) : ' + cpuInfo);
         serverInfo.cpu = cpuInfo;
         callback(null,serverInfo);
       });
    },
    // mem ==> os-utils
    function(data, callback){
      console.log("memory");
      var totalMem = osutils.totalmem();
      var freeMem = osutils.freemem();
      var usedMem = totalMem - freeMem;
      data.memory =  usedMem + "/" +  totalMem;
      console.log(data.memory);
      callback(null, data);
    },
      //network
      function(data,callback){
        console.log("network");
        netstat.inOut().then(info => {
          //console.log(info);
          //data.network = info[1].inputBytes
          data.network = info;
          console.log(data.network);
          callback(null, data);
        });
      },
  ],
  function(err, result){
      //console.log("callback result==>" + result.memory);
      res.send(result);
  });
});

// node cmd / setChannelRestart
app.get('/API/cmdChannelCheck', function(req, res, next){
  console.log('====== cmdChannelCheck =====');
  channelCheck(function(){
    res.send("ok");
  });
});

// node cmd / setChannelRestart
app.get('/API/setChannelRestart', function(req, res, next){
  console.log('====== setChannelRestart =====');
  var channel_id = req.query.channel_id;

  if((channel_id == 'undefined') || (channel_id == null)) {
    console.log("[error][setChannelRestart] channel_id : " + channel_id + "/ undefined or null !!!");
    res.send({"result":"error 1"});
    return;
  }
  console.log(channel_id);

  // // invalid check~
  // 전체 채널의 대한 기본적인 체크를 한다
  var check = "false";
  for(var i = 0; i < AllChannel_list.length; i++){
    if(channel_id == AllChannel_list[i]){
      check = "true";
      break;
    }
  }

  if(check == "false"){
    console.log("[error][setChannelRestart] channel_id : " + channel_id + "is Invalid !!!");
    res.send({"result":"error 2"});
    return;
  }
  cmd.get(_SH_PATH_+"/shutdown.sh "+channel_id , function(err, data, stderr){
    console.log(channel_id);
      cmd.get(_SH_PATH_+"/run.sh "+ channel_id ,  function(err, data, stderr){
        console.log("run:" + channel_id);
        //writefile
          activeChannelToJSON("add", channel_id, function(){
              console.log("write callback");
              res.send({"result":"ok"});
          });
      });
  });
});

app.get('/API/setChannelTerminate', function(req, res, next){
  console.log('====== setChannelTerminate =====');
  var channel_id = req.query.channel_id;
  if((channel_id == 'undefined') || (channel_id == null)) {
      console.log("[error][setChannelTerminate] channel_id : " + channel_id + "is Invalid !!!");
      res.send({"result":"error"});
      return;
    }
  console.log(channel_id);
  //console.log(_SH_PATH_+"/shutdown.sh "+channel_id);
  cmd.get(_SH_PATH_+"/shutdown.sh "+channel_id , function(err, data, stderr){
    console.log(data);
    console.log("channel=====> " + channel_id);
    activeChannelToJSON("remove", channel_id, function(rlt){
        console.log("write callback");
        res.send({"result":"ok"});
    });
  });
});

// write json readFile
var activeChannelToJSON = function(cmd, channel_id, callback){
  console.log("activeChannelToJSON() !!  channel_id =>" + channel_id);
  var flag = false;

  if(cmd == "remove"){
    console.log("remove to active channel!");
    var index = channel_list.indexOf(channel_id);
    if(index > -1 ){
      channel_list.splice(index, 1);
      flag = true;
    }
  }else if(cmd == "add"){
    console.log("add to active channel!");
    //만약 이미 있는 채널은 패스
    var check = channel_list.indexOf(channel_id);
    if(check != -1 ){  // 존재
      flag = false;
    }else {
      channel_list.push(channel_id);
      flag = true;
    }
  }
  console.log("Check ==========> " + flag)
  if(flag == true){
    //var obj = {channel_list:[], active_list:[]};
    //obj.channel_list = channel_list;
    var obj = {channel_list:[]};
    obj.channel_list = channel_list;

    var json_list = JSON.stringify(obj);
    fs.writeFile(_SH_PATH_+"/channel_list.json", json_list, 'utf8', function(err, data, stderr){
        console.log("json write ok");
        callback("ok");
    });
  }
  else {
      callback("error");
  }

}

app.listen(3000, function(){
  //startFFmpegChannel();
	console.log('Conneted 3000 port!!');
});


//
//
// // node cmd / setChannelRestart
// ///home/willfonk/service/KR/run.sh wo080
// app.post('/API/setChannelRestart', function(req, res, next){
//   console.log('======setChannelRestart=====');
//   var channel_id = req.body.channel_id;
//   console.log(channel_id);
//   cmd.get("./shutdown.sh "+channel_id , function(err, data, stderr){
//     console.log(channel_id);
//
//       cmd.get("./run.sh "+ channel_id ,  function(err, data, stderr){
//         console.log("run:" + channel_id);
//         res.send({"result":"ok"});
//       });
//   });
// });
//
//
// app.post('/API/setChannelTerminate', function(req, res, next){
//   console.log('======setChannelRestart=====');
//   var channel_id = req.body.channel_id;
//   console.log(channel_id);
//
//   cmd.get("./shutdown.sh "+channel_id , function(err, data, stderr){
//     console.log(data);
//     res.send({"result":"ok"});
//   });
// });





/*
app.post('/ajax', function(req, res, next) {
    console.log('POST 방식으로 서버 호출됨');
    var msg = req.body.msg;
    msg = '[에코]' + msg;
    res.send({result:true, msg:msg});
});
*/
/*
app.get('/', function(req, res) {
  res.send("Hello Realm");
});

app.get('/test', function(req, res) {
  res.send("Hello test");
});
*/
