
'use strict';

var dev_name  //执行函数get_dev_name()后，获得磁盘名
var file_wait_copy_path = '/ruff/log.data/'//等待拷贝的文件路径
var file_wait_copy = 'app.log'//等待拷贝的文件名

var disk_status  //当前所处的状态  1-无磁盘无挂载，2-有磁盘未挂载，3-有磁盘已挂载，4-无磁盘已挂载

var mount_switch = 0;  //为0可以挂载，为1则不可以挂载，防止同一指令多次执行。
var umount_switch = 0;

$.ready(function (error) {
    if (error) {
        console.log(error);
        return;
    }
    var fs = require('fs');
    var spawn = require('child_process').spawn;

function test_dev() {   
    var dir = fs.readdirSync('/dev/disk/by-uuid').toString();
    var dir_file = dir.split(',');
    var dir_file_number = dir_file.length;
    if ( dir_file_number > 2 )
    {
       
        if( mount_switch == 0 ) 
        {
            disk_status = 2;  //有磁盘无挂载 2
        }
        else if( mount_switch == 1 )
        {
            disk_status = 3;  //有磁盘已挂载 3
        }
    }
    else
    {
        
        if ( mount_switch == 0 )  
        {
            disk_status = 1;  //无磁盘无挂载 1
        }
        if ( mount_switch == 1 )
        {
            disk_status = 4;  //无磁盘已挂载，属于异常  直接执行dev_umount()函数
        }
    }
}   


/* get dev name  */
function get_dev_name() {

    var lines = fs.readFileSync('/proc/partitions').toString();
    var ret = lines.split('\n');
    var dev = ret[ret.length-2].split(' ');
    dev_name = dev[dev.length-1];
    console.log(dev_name);
    console.log('get_dev_name finished');
}



/*  mount */
function dev_mount() {
    var file_exist = fs.existsSync('/tmp/'+dev_name);
    if (file_exist == true)
    {
        clean_dir();
    } 
    if ( mount_switch == 0 )
    {
        mount_switch = 1;
        umount_switch = 0;
        fs.mkdirSync('/tmp/'+dev_name);
        var ls = spawn('mount',['/dev/'+dev_name,'/tmp/'+dev_name]);
        ls.on('exit',function(code){
            if ( code == 0 )
            {
                console.log('dev_mount finished');
                //发送挂载成功

            }
            if ( code !=0 )
            {
                console.log('dev_mount failed');
                //发送挂载失败

            }
        });
        
    }

}


/* copy */ 
function dev_copy() {

    var ls = spawn('cp',[ '-r',file_wait_copy_path+'/'+file_wait_copy,'/tmp/'+dev_name ]);
    //发送 拷贝进行中  

    ls.on('exit',function(code){
        if ( code == 0 )
        {
            console.log('cp finished');
            //发送拷贝完成
        }
        if ( code !=0 )
        {
            console.log('cp failed');
            //发送拷贝失败
        }
    });

    console.log('dev_copy finished');
}

/* umount */
function dev_umount() {
    if ( umount_switch == 0 )
    {   
        umount_switch = 1;
        mount_switch = 0;
        var ls = spawn( 'umount',[ '/tmp/'+dev_name ]);  
        ls.on('exit',function(code){
            if ( code == 0 )
            {
                console.log('dev_umount finished');
                clean_dir();
                //发送解挂成功
            }
            if ( code !=0 )
            {
                console.log('dev_umount failed');
                //发送解挂失败
            }
        });
        
    }
}

function clean_dir() {
    fs.rmdirSync('/tmp/'+dev_name);
    console.log('clean dir finished');
}


});
$.end(function () {
});
