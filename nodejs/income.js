/*
蝦皮交易費用
https://help.shopee.tw/hc/zh-tw/articles/115007702268-%E4%BB%80%E9%BA%BC%E6%98%AF%E6%88%90%E4%BA%A4%E6%89%8B%E7%BA%8C%E8%B2%BB-%E9%80%99%E8%A6%81%E5%A6%82%E4%BD%95%E8%A8%88%E7%AE%97-
https://help.shopee.tw/hc/zh-tw/articles/115007702288-%E4%BB%80%E9%BA%BC%E6%98%AF%E4%BF%A1%E7%94%A8%E5%8D%A1%E4%BA%A4%E6%98%93%E6%89%8B%E7%BA%8C%E8%B2%BB-%E9%80%99%E8%A6%81%E5%A6%82%E4%BD%95%E8%A8%88%E7%AE%97-

*/




var fs = require('fs');
//var csv = require('csv');
var csv = require('csv-parser');
var iconv = require('iconv-lite');

var exgRMBtoTWD = 4.6;      // RMB 兌換 TWD
var itemWeightCost = 90;    // 單一品項重量運費成本 Kg/TWD

var getBetweenString = function( strSource, keywordS, keywordE ) {
    var idxS = strSource.indexOf( keywordS );
    var idxE = strSource.indexOf( keywordE, idxS );
    //console.log( idxS, idxE )
    return strSource.substring(idxS + keywordS.length, idxE);
};

var allInfo = {
    totalOrder:0,           // 總訂單數
    totalProfit:0,          // 總毛利
    totalIncome:0,          // 總營收
    itemSale:{},            // 商品銷售統計
    totalFreeTransCnt:0,    // 免運訂單數量()
    totalItemSaleCnt:0,     // 商品銷售總數量
    buyerList:{},           // 紀錄買家清單, 統計不重複買家數
};

var itemCostList = {};
var FREE_TRANS_AMOUNT = 699;    // 設定免運金額
fs.createReadStream('成本清單.csv').pipe(csv()).on('data', function (oneItem) {
    //console.log( ' %s', JSON.stringify(oneItem) );
    //console.log( '商品資訊: %s', oneOrder['商品資訊'] )
    //Object.keys(data).forEach( function(kk) {
    //    console.log( kk, data[kk] )
    //})
    var itemId = oneItem['品項'];
    var itemModel = oneItem['型別'];
    var itemCostRMB = parseFloat(oneItem['成本 RMB']);
    var itemCostTWD = parseFloat(oneItem['成本 TWD']);


    if ( itemModel == '' ) {
        itemModel = 'default';
    }
    if ( !(itemId in itemCostList) ) {
        itemCostList[itemId] = {};
    }
    if ( !(itemModel in itemCostList[itemId]) ) {
        itemCostList[itemId][itemModel] = {};
    }

    itemCostList[itemId][itemModel] = {
        'itemCostTWD':itemCostTWD,
        'itemCostRMB':itemCostRMB
    };
    //console.log(itemCostList[itemId] )
}).on('end', function() {
    //console.log(itemCostList);

    var incomeFilename = './IncomeData/fafafa1019.shopee-order.20181101-20181130.csv';
    if (process.argv.length < 3) {
        console.log( 'Please type "nodejs [Income CSV File Path] ..."' );
        //return
    }
    else {
        incomeFilename = process.argv[2];
    }

    console.log( 'Read CSV File = ' + incomeFilename );
    fs.createReadStream(incomeFilename).pipe(iconv.decodeStream('big5')).pipe(csv()).on('data', function (oneOrder) {
        if ( oneOrder['訂單編號'] != '' ){
            var orderPrice = parseInt(oneOrder['訂單小計 (TWD)']);
            var orderTotalPrice = parseFloat(oneOrder['訂單總金額']);
            var shippingFee  = parseInt(oneOrder['買家支付的運費']);
            var payType = oneOrder['付款方式'];
            var shippingType = oneOrder['寄送方式'];
            var buyerAccount = oneOrder['買家帳號'];

            var profit = 0;                         // 本訂單獲利
            var handlingFeeShopee = 0.0;            // 蝦皮收取的手續費
            var handlingFeeCreditCard = 0.0;        // 信用卡收取的手續費

            var items = oneOrder['商品資訊'].split('\n');
            for ( i = 0; i < items.length; i++ ) {
                //console.log( items[i] );
                var itemName = getBetweenString( items[i], '商品名稱:', ';' );
                var itemId = getBetweenString( items[i], '主商品貨號: ', ';' );
                var itemModel = getBetweenString( items[i], '商品選項名稱:', ';' );
                var itemQty = parseInt(getBetweenString( items[i], '數量: ', ';' ));
                var itemPrice = parseInt(getBetweenString( items[i], '價格: $ ', ';' ));
                //console.log( itemId, itemQty, payType, shippingType, orderTotalPrice, itemModel, itemName )

                if ( itemId in itemCostList ) {    // itemId 存在
                    var grossProfit = 0;
                    var itemCost = 0;
                    if ( itemModel in itemCostList[itemId] ) { // 商品選項存在
                        itemCost = itemCostList[itemId][itemModel]['itemCostTWD'];
                        if ( itemCostList[itemId][itemModel]['itemWeight'] > 0 ) {  // 如果有設定重量, 則以 RMB + 運費做為計算
                            itemCost = ( itemCostList[itemId][itemModel]['itemCostRMB'] * exgRMBtoTWD ) + ( itemCostList[itemId][itemModel]['itemWeight'] * itemWeightCost );
                        }
                    } else {
                        itemCost = itemCostList[itemId]['default']['itemCostTWD'];
                        if ( itemCostList[itemId]['default']['itemWeight'] > 0 ) {  // 如果有設定重量, 則以 RMB + 運費做為計算
                            itemCost = ( itemCostList[itemId]['default']['itemCostRMB'] * exgRMBtoTWD ) + ( itemCostList[itemId]['default']['itemWeight'] * itemWeightCost );
                        }
                    }
                    if ( itemCost == 0 || isNaN(itemCost) ) {
                        console.log('Error: itemId:%s cost=%d is not a number!', itemId, itemCost);
                    }
                    grossProfit = ( itemPrice - itemCost ) * itemQty;
                    handlingFeeShopee += ( itemPrice * 0.005 );
                    profit += grossProfit;

                    // 統計各商品銷售數
                    if (!allInfo['itemSale'].hasOwnProperty(itemId) )    { allInfo['itemSale'][itemId] = { 'itemId':itemId, 'name':'', 'totalCnt':0, 'modelList':{} } };
                    allInfo['itemSale'][itemId]['name'] = itemName;
                    allInfo['itemSale'][itemId]['totalCnt'] += itemQty;
                    if (!allInfo['itemSale'][itemId]['modelList'].hasOwnProperty(itemModel) ) { allInfo['itemSale'][itemId]['modelList'][itemModel] = { cnt:0 } };
                    allInfo['itemSale'][itemId]['modelList'][itemModel]['cnt'] += itemQty;
                    allInfo['totalItemSaleCnt'] += itemQty;
                } else {
                    console.log( 'Error: itemId:%s not in itemCostList!', itemId );
                }
                if ( payType.indexOf( '信用卡' ) >= 0 ) {
                    handlingFeeCreditCard = orderTotalPrice * 0.015;
                }
            }
            allInfo['totalOrder'] += 1;
            allInfo['totalProfit'] += ( profit - Math.round(handlingFeeShopee) - Math.round(handlingFeeCreditCard) - (60-shippingFee) );
            allInfo['totalIncome'] += ( orderPrice - Math.round(handlingFeeShopee) - Math.round(handlingFeeCreditCard) - (60-shippingFee) );
            if ( orderPrice >= FREE_TRANS_AMOUNT )
            {
                allInfo['totalFreeTransCnt'] += 1;
            }
            var orderIncome = ( orderPrice - Math.round(handlingFeeShopee) - Math.round(handlingFeeCreditCard) - (60-shippingFee) );
                //console.log( handlingFee );

            // 統計重複買家數
            if ( !allInfo['buyerList'].hasOwnProperty(buyerAccount) )   {   allInfo['buyerList'][buyerAccount] = 0; }
            allInfo['buyerList'][buyerAccount] += 1;
            //console.log('--------------------', allInfo['totalProfit'], orderIncome, oneOrder['買家帳號'], oneOrder['訂單成立時間'], oneOrder['訂單完成時間'])
        }
    }).on('end', function() {
        console.log( "總訂單:%d", allInfo['totalOrder'] );
        console.log( "不重複買家數:%d", Object.keys(allInfo['buyerList']).length );
        console.log( "購買超過 1 次以上的買家:" );
        for( var key in allInfo['buyerList']) {
            if ( allInfo['buyerList'][key] > 1 )    {   console.log( "     ", key, allInfo['buyerList'][key] );  }
        }
        console.log( "總淨利:%d, 毛利率:%d", allInfo['totalProfit'], (allInfo['totalProfit'] / allInfo['totalIncome'] * 100) );
        console.log( "總營收:%d", allInfo['totalIncome'] );
        console.log( "符合免運訂單數:", allInfo['totalFreeTransCnt'], allInfo['totalFreeTransCnt'] * 30 );
        console.log( "銷售商品總數:", allInfo['totalItemSaleCnt'], " 平均訂單購買商品數:", allInfo['totalItemSaleCnt'] / allInfo['totalOrder']);
        console.log( "銷售統計:" /*, JSON.stringify(allInfo['itemSale'], null, 4)*/ );

        var arr = [];
        for ( var key in allInfo['itemSale']) {
            arr.push( allInfo['itemSale'][key] );
        }
        var objSort = arr.sort( function( a, b ) {
            return b['totalCnt'] - a['totalCnt'];
        });
        for ( var i = 0; i < objSort.length; i++ ) {
            //console.log( JSON.stringify(objSort[i]))
            console.log('%s %s   %s', (objSort[i]['itemId'] + '       ').slice(0,15), ("     " + objSort[i]['totalCnt']).slice(-5), objSort[i]['name']);
            for (var keySub in objSort[i]['modelList']) {
                console.log('     %s %d', keySub, objSort[i]['modelList'][keySub]['cnt']);
            }
        }
    });
});





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
