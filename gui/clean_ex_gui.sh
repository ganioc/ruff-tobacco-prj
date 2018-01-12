#! /bin/sh

## this script is for clean redundant qt process

pid=`ps auxw | grep tabacooui | grep -v grep | awk '{print $2}'`
echo $pid
if [ $pid -gt 0 ]
then
    echo "kill the existed tabacooui"
    kill -9 $pid
else
    echo "no existing tabacooui"
fi

exit 0
