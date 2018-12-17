var fs = require('fs');
//var csv = require('csv');
var csv = require('csv-parser');
var iconv = require('iconv-lite');
var request = require('request');
var download = require('download-file');

var urlSource = 'https://detail.1688.com/offer/568198096224.html';

if (process.argv.length < 2)
{
    console.log( 'type "node get1688Pic.js [url] [path]"' );
    process.exit(0);
}
urlSource = process.argv[2];

var get1688Pic_out_path = './get1688Pic_out/'
var header = {
'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:63.0) Gecko/20100101 Firefox/63.0',
'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
 'Connection': 'keep-alive' };
//console.log(header);
request({url: urlSource, encoding:null, headers:header, followAllRedirects:true , rejectUnauthorized: false, method: 'GET'}, function (err, response, body) {
    if (err) {
        console.log(err)
    }

    if (response.statusCode == 200) {
        body = iconv.decode(new Buffer(body), "gbk");
        body = body.toString();

        var searchKeyword = '';
        var searchSP = 0, idxS, idxE;

        // 取出 product id
        idxE = body.indexOf( '.60x60', 0 );
        idxS = body.lastIndexOf( '_', idxE );
        var productId = body.substring(idxS + 1, idxE);
        console.log( 'productId:' + productId );

        // 找到 .60x60.jpg
        for ( var i = 1; i <= 50; i++ ) {
            var tmpSP = body.indexOf( '.60x60', searchSP );
            if ( tmpSP < 0 )    break;
            idxS = body.lastIndexOf( '"', tmpSP );
            idxE = body.indexOf( '"', tmpSP );
            var tmpStr = body.substring(idxS + 1, idxE);
            tmpStr = tmpStr.replace( '.60x60', '' );
            console.log( tmpStr );
            download( tmpStr, { directory:get1688Pic_out_path, filename:'A' + ( '0' + i.toString() ).slice(-2) + '.jpg' } );

            searchSP = tmpSP + 1;
        }

        // 找到 "data-tfs-url=" 或 "加载中..."
        searchSP = 0;
        searchKeyword = 'data-tfs-url="';
        idxS = body.indexOf( searchKeyword );
        idxE = body.indexOf( '"', idxS + searchKeyword.length );
        var urlContentPic = body.substring(idxS + searchKeyword.length , idxE );
        console.log( '解析...' + urlContentPic );

        request({url: urlContentPic, encoding:null, headers:header, followAllRedirects:true , rejectUnauthorized: false, method: 'GET'}, function (err, response, body) {
            if (err) {
                console.log(err)
            }
            if (response.statusCode == 200) {
                body = iconv.decode(new Buffer(body), "gbk");
                body = body.toString();

                //console.log(body);

                // 找到 productId + "."
                searchKeyword = productId + '.jpg';
                searchSP = 0;
                for ( var i = 1; i <= 50; i++ ) {
                    var tmpSP = body.indexOf( searchKeyword, searchSP );
                    if ( tmpSP < 0 )    break;
                    idxS = body.lastIndexOf( '"', tmpSP );
                    idxE = body.indexOf( '\"', tmpSP );
                    var tmpStr = body.substring(idxS + 1, idxE );
                    tmpStr = tmpStr.replace( '\\', '' );
                    console.log( tmpStr );
                    download( tmpStr, { directory:get1688Pic_out_path, filename:'B' + ( '0' + i.toString() ).slice(-2) + '.jpg' } );
                    searchSP = tmpSP + 1;
                }
            }
        } );

        //console.log(body)
    }
} );




//console.log( getBetweenString( "中二文字一二三", "文", "二") );
//fs.readFile('aaa.csv', {encoding: 'utf8'}, function(err, data) {
//  var buf = data.toString('utf8');
//  var splitLine = buf.split('\r\n');
//  for( i = 0; i < splitLine.length; i++ ) {
//    console.log( splitLine[i] );
//    console.log("------")
//    //oneLine = splitLine[i];
//    //splitField = oneLine.split( ',' );
//    //console.log("----", splitField[12])
//  }
//});
