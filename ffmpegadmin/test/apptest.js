
//var ajax = require('./routes/ajax');
var cors = require('cors');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();
var exec = require('child_process').exec; //
var cmd = require('node-cmd');
var osutils = require('os-utils');
//async
var async = require('async');

//log
var fs = require('fs')
  , Log = require('log')
  , log = new Log('debug', fs.createWriteStream('my.log'));


var osu = require('node-os-utils');
var cpu = osu.cpu;
var mem = osu.mem;
var netstat = osu.netstat;

//var file = '/home/willfonk/service/ffmpegadmin/test/ffmpegConfig.json';
var file = './ffmpegConfig.json';
var json_fs = require('fs');

//app.use('/ajax',ajax);
//app.set('views', __dirname + '/views');

//app.use(cors());
app.use(bodyParser.urlencoded({extended:true}));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/views')); // 여기서 hteml 파일

var channel_list = new Array();

// 서버 재기동시 자동으로 채널을 재시작
startFFmpegChannel();

// 서버 재기동시 자동으로 채널을 재시작
function startFFmpegChannel(){
  console.log("startFFmpegChannel start !!!");

  json_fs.readFile(file, 'utf8', function(err, data){
    var json_info = JSON.parse(data);
    var channel = json_info.channel_list;
    console.log(channel);

    for(var i = 0; i < channel.length; i++){
      console.log(channel[i]);
      channel_list.push(channel[i]);

      //check channel
      var channel_id = channel[i];
      console.log("channel_id:" + channel_id );
      cmd.get("./checker.sh " + channel_id ,
        function (err, data, stderr){
          if(data > 0){
              console.log("data===>" + data);
          }
          else {
            console.log("start channel ==> " + data);

            cmd.get("./run.sh " + data, function (err, data, stderr){
              console.log("data");
            });
          }
      });
    }//end for
  });
};

app.all('/*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

app.get('/', function(req, res){
    //res.send('hello world');
    res.sendFile(__dirname + '/test.html');
});

// os-utils test
app.get('/API/error-test', function(req, res, next) {
  startFFmpegChannel();

  var channel_id = req.query.channel_id;
  if(typeof channel_id == "undefined"){
    console.log("error");
    log.error('undefined channel_id ~ error');
    res.send("channel_id is undefined !!! error!!! ");
    return;
  }

  if(channel_id == null){
    console.log("null");
    res.send("channel_id is null!! error");
    return;
  }
  console.log(channel_id);
  res.send("ok");
});

// os-utils test
app.get('/API/os-test', function(req, res, next) {

    osutils.cpuUsage(function(v) {
      console.log('CPU Usage (%) : ' + v * 100);
    });
    console.log('====== os-utils ========== ');
    console.log("Total Memory==> " + osutils.totalmem() + "MB");
    console.log("Free Memory: " + osutils.freemem() + "MB");
    console.log("Free Memory (%): " + osutils.freememPercentage());

    console.log('====== node-os-utils ========== ');
    cpu.usage().then(cpuPercentage => {
        console.log("cpu Per :" + cpuPercentage);
      });
    mem.info().then(info => {
        //console.log(info);
        //var memory = info.totalMemMb + "/" + info.usedMemMb;
        console.log(info);
    });

    res.send("ok");
});


// ------------- getServerStatus
//   서버 상태 표시
// async /getServerStatus
app.get('/API/getServerStatus', function(req, res, next){
  console.log('======test=====');
  var serverInfo = {"cpu": null , "memory":null , "network": null};
  async.waterfall([
      // cpu ==> node-os-utils
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
           data.network = info.total;
        //  console.log(data.network);
          callback(null, data);
        });
      },
  ],
  function(err, result){
      //console.log("callback result==>" + result.memory);
      res.send(result);
  });
});


// ------------- setChannelRestart
//ffmpeg  채널 리스트
// node cmd / getFFmpegProcess
app.get('/API/getFFmpegProcess', function(req, res, next){
  console.log('======getFFmpegProcess=====');
  cmd.get( "ps -ef | grep ffmpeg | grep -v 'grep'" , function(err, data,stderr){
    console.log(data);
    res.send(data);
  });
});

// ------------- setChannelRestart
//   채널 재시작 / 채널 추가
app.get('/API/setChannelRestart', function(req, res, next){
  console.log('======setChannelRestart=====');
  var channel_id = req.query.channel_id;

  if((channel_id == 'undefined') || (channel_id == null)) {
    res.send({"result":"error 1"});
    return;
  }
  console.log(channel_id);

  var check = "false";
  for(var i = 0; i < channel_list.length; i++){
    if(channel_id == channel_list[i]){
      check = "true";
      break;
    }
  }

  if(check == "false"){
    res.send({"result":"error 2"});
    return;
  }

  cmd.get("./shutdown.sh "+channel_id , function(err, data, stderr){
    console.log(channel_id);
      cmd.get("./run.sh "+ channel_id ,  function(err, data, stderr){
        console.log("run:" + channel_id);
        res.send({"result":"ok"});
      });
  });
});


// ------------- setChannelTerminate
//   채널 종료
app.get('/API/setChannelTerminate', function(req, res, next){
  console.log('======setChannelTerminate=====');
  var channel_id = req.query.channel_id;

  if((channel_id == 'undefined') || (channel_id == null)) {
    res.send({"result":"error 1"});
    return;
  }

  console.log(channel_id);

  cmd.get("./shutdown.sh "+channel_id , function(err, data, stderr){
    console.log(data);
    res.send({"result":"ok"});
  });
});


// node cmd
app.get('/API/node-cmd', function(req, res, next){
  console.log('======test=====');

  //var command = "top -n 1 | grep -i cpu\(s\)| awk '{print $5}' | tr -d "+  '"%id,"' + " | awk '{print 100-$1}' ";
  //console.log(command);
  //var command = "ls";

  cmd.get( "top -b -n1 | grep 'load average'", function(err, data,stderr){
    console.log(data);
  });
});

app.get('/API/test2', function(req, res, next) {
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
      res.send({cpu:100, memory: "1024/6400", network:150});
    });
});

//
// // node cmd / setChannelRestart
// ///home/willfonk/service/KR/run.sh wo080
// app.post('/API/setChannelRestart', function(req, res, next){
//   console.log('======setChannelRestart=====');
//
//   var channel_id = req.body.channel_id;
//   console.log(channel_id);
//
//   cmd.get("./shutdown.sh "+channel_id , function(err, data, stderr){
//     console.log(channel_id);
//
//       cmd.get("./run.sh "+ channel_id ,  function(err, data, stderr){
//         console.log("run:" + channel_id);
//         res.send(channel_id);
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
//     res.send(data);
//   });
// });


// //backup
// app.get('/API/test', function(req, res, next){
//   console.log('======test=====');
//   //  var command = "top -n 1 | grep -i cpu\\(s\\) | awk '{print $5}' | tr -d \"%id,\" | awk '{print 100-$1}'";
//
//   //cpu usage : os-utils
//   os.cpuUsage(function(v){
//       console.log("cpu usage (%):" + v);
//   });
//
//   //console.log(os.cpuUsage());
//   console.log("mem:" + os.totalmem());
//   console.log("free mem :" + os.freemem());
//   console.log("mem per : " + os.freememPercentage());
//
//
//   //node-os-utils
//   cpu.usage().then(cpuPercentage => {
//     console.log("cpu Per :" + cpuPercentage);
//   });
//
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

//
// backup
// // async /getServerStatus
// app.get('/API/getServerStatus', function(req, res, next){
//   console.log('======test=====');
//   var serverInfo = {"cpu": null , "memory":null , "network": null};
//   async.waterfall([
//       // cpu
//       function(callback){
//          console.log("cpu");
//          cpu.usage().then(cpuPercentage => {
//             // console.log("cpu Per :" + cpuPercentage);
//              serverInfo.cpu = cpuPercentage;
//              console.log(serverInfo.cpu);
//              callback(null, serverInfo);
//          });
//       },
//
//       // mem
//       function(data, callback){
//         console.log("memory");
//         mem.info().then(info => {
//             //console.log(info);
//             data.memory = info.totalMemMb + "/" + info.usedMemMb;
//             console.log(data.memory);
//             callback(null, data);
//         });
//       },
//
//       //network
//       function(data,callback){
//         console.log("network");
//         netstat.stats().then(info => {
//           //console.log(info);
//           data.network = info[1].inputBytes
//           console.log(data.network);
//           callback(null, data);
//         });
//       },
//   ],
//   function(err, result){
//       //console.log("callback result==>" + result.memory);
//       res.send(result);
//   });
// });

app.listen(3001,
  function (){
    console.log("startFFmpegChannel start !!!");

    json_fs.readFile(file, 'utf8', function(err, data){
      var json_info = JSON.parse(data);
      var channel = json_info.channel_list;
      console.log(channel);

      for(var i = 0; i < channel.length; i++){
        console.log(channel[i]);
        channel_list.push(channel[i]);

        //check channel
        var channel_id = channel[i];
        console.log("channel_id:" + channel_id );
        cmd.get("./checker.sh " + channel_id ,
          function (err, data, stderr){
            if(data > 0){
                console.log("data===>" + data);
            }
            else {
              console.log("start channel ==> " + data);

              cmd.get("./run.sh " + data, function (err, data, stderr){
                console.log("data");
              });
            }
        });
      }//end for

  });

	console.log('Conneted 3001 port!!');
});



app.listen(3000, function(){
	console.log('Conneted 3000 port!!');
});
