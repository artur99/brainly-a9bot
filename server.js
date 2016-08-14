var cfduid = '******';
var authadata = '5:::{"name":"auth","args":[{"uid":***,"id":***,"nick":"****","gender":2,"avatar":"","auth_hash":"***","rid":999999999,"client":"desktop"}]}';
var token_long = '*****';
var token_short = '****';


var sokid = '';
var WebSocket = require('ws');
var http = require('http');
var slug = require('slug');
var querystring = require('querystring');
var db = {
    // main: require('a9-db').init('main'),
    convs: require('a9-db').init('convs'),
    logs: require('a9-db').init('logs'),
};
console.log2 = function(){
    var args = Array.prototype.slice.call(arguments).join(" ");
    console.log(args);
    // var dy = new Date();
    // dy.setMinutes(0);
    // dy.setSeconds(0);
    // dy.setMilliseconds(0);
    // dy = dy.getTime();
    // db.logs.get(dy, function(dtk){
    //     if(typeof dtk == 'undefined' || !dtk) dtk = [];
    //     else dtk = Array.prototype.slice.call(dtk);
    //     dtk.push(args);
    //     db.logs.set(dy, dtk);
    // });
}
var req = http.request({
    protocol: 'http:',
    host: 'a.hive.api.z-dn.net',
    port: 1254,
    path: '/socket.io/1/?t='+Math.round(new Date().getTime()/1000),
    headers: {'Cookie':'__cfduid='+cfduid}
}, function(response) {
    var body = '';
    response.on('data', function(d) {body += d;});
    response.on('end', function() {
        sokid = body.split(':')[0];
        console.log2('Got socket id: `'+sokid+'`');
        start();
    });
}).end();
function start(){
    ws = new WebSocket('ws://a.hive.api.z-dn.net:1254/socket.io/1/websocket/'+sokid, '', {
        headers:{'Cookie':'__cfduid='+cfduid}
    });
    ws.on('open', function(){
        console.log2("Connected!");
        ws.send(authadata);
    });
    ws.on('message', function(data, flags) {
        var dt = a9.render(data);
        if(!dt)return;
        if(typeof dt.name!='undefined' && dt.name == 'message.receive'){
            for(var i in dt.args)
                a9.handle_msg(dt.args[i].data, dt.args[i].users_data[1]);
        }
    });
    ws.on('close', function(){
        console.log2("Closed!");
        throw new Error('Closed!');
    });
}
a9 = {
    render: function(data){
        try{
            return JSON.parse(data.substr(4));
        }catch(e){
            console.log2('Got data: `'+data+'`');
            return false;
        }
    },
    handle_msg: function(data, sender){
        var msg = data.content.trim();
        var msgindex = slug(msg.toLowerCase(), '-').split('-');
        var mtype = a9.msgtype(msgindex, msg, sender);
        db.convs.get(data.conversation_id, function(cdt){
            if(typeof cdt == 'undefined' || !cdt || typeof cdt.msg == 'undefined') cdt={msg:[]};
            if(typeof cdt != 'undefined' && typeof cdt.lastdata == 'object' && cdt.lastdata && cdt.lastdata.type == 'confirm' && mtype!='main0'){
                //Am primit răspuns pentru o întrebare
                var mi = msgindex;
                var anc = mi.join('').trim();
                if(anc[0]=='d'&&anc[1]=='a') mtype = cdt.lastdata.name;
                else if(mi[0]=='nu' || mi[0]=='anulare' || mi[0]=='stop' || mi[0]=='stai') mtype = 'anulare';
                else mtype = 'main';

                cdt.lastdata = null;
            }else{
                if(mtype=='main-cod') cdt.lastdata = {'type':'confirm', 'name':'cod'};
                else cdt.lastdata = null;
            }
            cdt.msg.push(data.content);
            db.convs.set(data.conversation_id, cdt);
            a9.do_msg(mtype, data, sender, msgindex);
        });
    },
    do_msg: function(mtype, data, sender, msgindex){
        console.log2(mtype);
        var joined = typeof msgindex == 'undefined' ? '' : msgindex.join('-');
        if(mtype == 'main0'){
            a9.send_msg(data.conversation_id, 'Salut!\nPentru instrucțiuni scrieți AJUTOR, pentru codul de test moderator scrieți COD.', sender);
        }else if(mtype == 'main'){
            a9.send_msg(data.conversation_id, 'Salut!\n*********\nPentru codul de test scrieți COD\n*********\nPentru a susține testul de moderator, trebuie să aveți cel puțin 100 de răspunsuri. Testul de moderator se poate susține o sinură dată. Pentru a primi un cod de acces la test, scrieti COD si veti primi datele de autentificare pe site-ul de test.\n', sender);//Pentru anunțuri scrieți NOUTĂȚI\n\n\n...Mai multe comenzi în viitorul apropiat...
        }else if(mtype == 'main-cod'){
            a9.send_msg(data.conversation_id, 'Doriți un cod pentru testul de moderator?\nRăspuns: DA/NU', sender);
        }else if(mtype == 'cod'){
            a9.send_msg(data.conversation_id, 'Vă rog să așteptați... Verific profilul...', sender);
            a9.engine_generate_code(data,sender);
        }else if(mtype == 'anulare'){
            a9.send_msg(data.conversation_id, 'Ok, am anulat. Pentru instrucțiuni scrieți AJUTOR, pentru codul de test moderator scrieți COD.', sender);
        }else if(mtype == 'cod-invalid'){
            a9.send_msg(data.conversation_id, 'Ne pare rău, dar contul dumneavoastră este prea nou. Pentru a putea da testul, vă trebuie minim 100 de răspunsuri pe site. Reveniți cand veți avea cel puțin 100 de răspunsuri pe site pentru a primi un cod.', sender);
        }else if(mtype == 'cod-invalid2'){
            a9.send_msg(data.conversation_id, 'Ne pare rău, dar ați primit deja un cod. Dacă credeți că a fost o grșeală, contactați un moderator.', sender);
        }else if(mtype == 'name'){
            a9.send_msg(data.conversation_id, 'Numele meu este A9Bot, am fost construit de artur99 și vârsta mea este de doar câteva luni. Tu cum te numești și câți ani ai?', sender);
            a9.update_ld2(data,'name');
        }else if(mtype == 'name2'){
            a9.send_msg(data.conversation_id, 'Foarte bine fac :D Tu ce faci?', sender);
            a9.update_ld2(data,'name2');
        }else if(mtype == 'name3'){
            a9.send_msg(data.conversation_id, 'Eu locuiesc în serverul creatorului, artur99(Vultur David), pe un Raspbian Jessie, parcă, într-un mic sat din Suceava. Tu de unde ești?', sender);
            a9.update_ld2(data,'name3');
        }else if(mtype == 'ref'){
            a9.send_msg(data.conversation_id, 'Puteți contacta unul din următorii moderatori:\n\nhttp://brainly.ro/profil/legislatie-287276\nhttp://brainly.ro/profil/VerdeDeParis-276124\nhttp://brainly.ro/profil/AdinaK-77849\nhttp://brainly.ro/profil/artur99-164255', sender);
        }else if(mtype == 'author'){
            a9.send_msg(data.conversation_id, 'Robotul a fost construit de artur99(Vultur David)\nLink: http://brainly.ro/profil/artur99-164255', sender);
        }else if(mtype == 'abt0'){
            a9.send_msg(data.conversation_id, 'Eu sunt un robot. Rolul meu a fost de a automatiza anumite task-uri ale moderatorilor pe Brainly.', sender);
        }else if(mtype == 'abt1'){
            a9.send_msg(data.conversation_id, 'Am fost construit în node.js, cu modulul ws, modulul slug și modulul creat special pentru mine a9-db. Stocarea se face în simple fișiere JSON. Conexiunea e făcută prin socketul oferit de Brainly.', sender);
        }else if(mtype == 'ok'){
            a9.send_msg(data.conversation_id, 'Ok!', sender);
        }else if(mtype == 'np'){
            a9.send_msg(data.conversation_id, 'Mă bucur că te-am putut ajuta :D', sender);
        }else if(mtype == 'smile'){
            a9.send_msg(data.conversation_id, ':D', sender);
        }else{
            a9.getnrem_ld2(data,function(last){
                if(last == 'name3'){
                    a9.send_msg(data.conversation_id, 'Ok... :D', sender);
                }else if(last == 'name2'){
                    if(joined.search('rau')>-1 || joined.search('trist')>-1 || joined.search('nu-prea-bine')>-1){
                        a9.send_msg(data.conversation_id, 'Aaah... :(', sender);
                    }else if(joined.search('bine')>-1){
                        a9.send_msg(data.conversation_id, 'Mă bucur :D', sender);
                    }else{
                        a9.send_msg(data.conversation_id, ':D', sender);
                    }
                }else if(last == 'name'){
                    a9.send_msg(data.conversation_id, ':D', sender);
                }else{
                    a9.send_msg(data.conversation_id, 'Încă nu știu să răspund la acest mesaj. Scrieți AJUTOR sau COD pentru alte instrucțiuni.', sender);
                }
            })
        }
    },
    send_msg: function(cid, text, to_data){
        var postData = JSON.stringify({
            'content': text,
            'conversation_id': cid,
            '_coupon_': '_JS_W29iamVjdCBPYmplY3RdXzE2NDI1NS0xNDYyMzQ2MDg2NjE4LTU1Nzc4OTk2'
        });
        var repl1 = 'ăîâșțĂÎÂȘȚ'.split('');
        var repl2 = '\\u0103,\\u00ee,\\u00e2,\\u0219,\\u021b,\\u0102,\\u00CE,\\u00C2,\\u0218,\\u021A'.split(',');

        for(var i in repl1)
            postData = postData.replace(new RegExp(repl1[i], 'g'), repl2[i]);
        var req = http.request({
            protocol: 'http:',
            host: 'brainly.ro',
            port: 80,
            path: '/api/27/api_messages/send',
            type: 'POST',
            headers: {
                'Cookie':'__cfduid='+cfduid,
                'X-B-Token-Long': token_long,
                'X-B-Token-Short': token_short,
                'Content-Length': postData.length
            }
        }, function(response) {
            var body = '';
            response.on('data', function(d) {body += d;});
            response.on('end', function() {/*console.log2(body,postData);*/});
        });
        req.write(postData);
        req.end();
        while(text.search('\n')>-1)text=text.replace('\n', ' \\ ');
        if(typeof to_data != 'undefined' && typeof to_data.nick != 'undefined')
            console.log2("Sending message to "+to_data.nick+"("+cid+"): `"+text+'`');
        else
            console.log2("Sending message to ("+cid+"): `"+text+'`');
    },
    msgtype: function(msg, msgstring, sender){
        console.log2("Got message: `"+msg.join('-')+"`");
        for(var i in msg)
            if(typeof msg[i]!='undefined' && msg[i]=='cod' || msg[i]=='codul') return 'main-cod';
        var joined = msg.join('-');
        var way1 = "salut,buna,hey,hei,sal,sall,hi,hii".split(',');
        var way2 = "ajutor,help,detalii,despre".split(',');
        for(var i in way1) if(msg[0]==way1[i])return 'main0';
        for(var i in way2) if(msg[0]==way2[i])return 'main';

        var way3 = ":D,;),:)".split(",");
        for(var i in way3) if(msgstring==way3[i])return 'smile';
        var strs = [
            {text: 'cum-te-numesti,cum-te-cheama,numele-tau,cati-ani-ai,ce-varsta-ai'.split(','), task: 'name'},
            {text: 'cum-va-numiti,cati-ani-aveti,ce-varsta-aveti'.split(','), task: 'name'},
            {text: 'ce-faci,ce-mai-faci,cum-o-mai-duci,cum-te-simti,how-are-you'.split(','), task: 'name2'},
            {text: 'ce-faceti,ce-mai-faceti,cum-o-mai-duceti,cum-va-simtiti'.split(','), task: 'name2'},
            {text: 'de-unde-esti,unde-locuiesti,din-ce-zona-esti,unde-stai,din-ce-judet-esti,din-ce-oras-esti,din-ce-sat-esti,locuiesti'.split(','), task: 'name3'},
            {text: 'de-unde-suntenti,unde-locuiti,din-ce-zona-sunteti,unde-stati,din-ce-judet-sunteti,din-ce-oras-sunteti,din-ce-sat-sunteti,locuiti'.split(','), task: 'name3'},
            {text: 'ce-moderator-sa-conteactez,ce-moderatori-sa-contactez,ce-moderator-pot-contacta,ce-moderatori-pot-contacta,ce-moderatori-as-putea-contacta,pe-cine-as-putea-contacta,pe-cine-sa-contactez,contactez-un-moderator,contacta-un-moderator'.split(','), task: 'ref'},
            {text: 'tea-construit,te-a-construit,te-a-creat,tea-creat,cine-ai-fost-construit,artur,artur99,vultur-david,david-vultur,david,autorul,creatorul'.split(','), task: 'author'},
            {text: 'cine-esti,ce-rol-ai,care-este-rolul-tau,ce-stii-sa-faci'.split(','), task: 'abt0'},
            {text: 'cum-ai-fost-construit,limbaj-de-programare,ce-limbaj,ce-program'.split(','), task: 'abt1'},
            {text: 'mersi,multumesc,thx,thank-you'.split(','), task: 'np'},
        ];
        for(var i = 0; i<strs.length; i++){
            for(var j = 0; j<strs[i].text.length; j++){
                if(joined.search(strs[i].text[j])>-1)return strs[i].task;
            }
        }
        var one = [
            {text:'bine', task: 'ok'},
            {text:'ok', task: 'ok'},
        ]
        for(var i = 0; i<one.length; i++){
            if(joined == one[i].text)return one[i].task;
        }


        // if(msg.join(' ').search('cod')!=-1)return 'main-cod';
        return '?';
    },
    update_ld2: function(data,val){
        db.convs.get(data.conversation_id, function(cdt){
            if(typeof cdt == 'undefined' || !cdt || typeof cdt.msg == 'undefined') cdt={msg:[]};
            cdt.lastdata2 = val;
            db.convs.set(data.conversation_id, cdt);
        });
    },
    getnrem_ld2: function(data,callback){
        db.convs.get(data.conversation_id, function(cdt){
            if(typeof cdt == 'undefined' || !cdt || typeof cdt.msg == 'undefined') cdt={msg:[]};
            if(typeof cdt.lastdata2 == 'undefined') cdt.lastdata2 = '';
            callback(cdt.lastdata2);
            cdt.lastdata2 = '';
            db.convs.set(data.conversation_id, cdt);
        });
    },
    engine_generate_code: function(data, sender){
        // var rk = sender.ranks.names;
        // var to_remove = 'începător,ajutor,ambițios,maestru'.split(',');
        // var send = 1;
        // for(var i in rk){
        //     for(var j in to_remove) if(slug(to_remove[i]).toLowerCase() == slug(rk[i]).toLowerCase()) send = 0;
        // }
        var req2 = http.request({
            protocol: 'http:',
            host: 'brainly.ro',
            path: '/api/27/api_user_stats/get/'+sender.id,
            headers: {
                'Cookie':'__cfduid='+cfduid,
                'X-B-Token-Long': token_long,
                'X-B-Token-Short': token_short
            }
        }, function(response) {
            var body = '';
            response.on('data', function(d) {body += d;});
            response.on('end', function() {
                var dkt = JSON.parse(body);
                var sum = 0;
                for(var i in dkt.data.responses_by_subject){
                    sum+=parseInt(dkt.data.responses_by_subject[i].responses_count);
                }
                if(sum>=100)send = 1; //QUALIFICATION LIMIT!!!!!!!!!!!!!!
                else send = 0;
                db.convs.get(data.conversation_id, function(cdt){
                    if(send == 0) setTimeout(function(){a9.do_msg('cod-invalid', data, sender);},100);
                    else if(false && typeof cdt.gotcode != 'undefined' && cdt.gotcode == 1){/*setTimeout(function(){a9.do_msg('cod-invalid2', data, sender);},100);*/}
                    else{
                        console.log2("Requesting code for `"+sender.nick+"`");
                        var req = http.request({
                            protocol: 'http:',
                            host: 'brainly.artur99.net',
                            port: 80,
                            path: '/ajax.php?q=admin_gen&****&username='+sender.nick,
                            headers: {
                                'Content-Length': 0,
                                'Accept':'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                                'Accept-Encoding':'gzip, deflate, sdch',
                                'Accept-Language':'en-US,en;q=0.8,ro;q=0.6,es;q=0.4',
                                'Cache-Control':'no-cache',
                                'Connection':'keep-alive',
                                'Host':'brainly.artur99.net',
                                'Pragma':'no-cache',
                                'Upgrade-Insecure-Requests':'1',
                                'User-Agent':'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2661.94 Safari/537.36'
                            }
                        }, function(response) {
                            var body = '';
                            response.on('data', function(d) {body += d;});
                            response.on('end', function() {
                                var pi = parseInt(body);
                                console.log(body);
                                if(pi>0){/*nothing here yet*/}
                                else{
                                    a9.do_msg('cod-invalid2', data, sender);
                                    console.log2("Ne-generat cod pentru `"+sender.nick+"`");
                                    return;
                                }
                                a9.send_msg(data.conversation_id, 'Nume: '+sender.nick+'\nCod: '+body+'\nLink: http://brainly.artur99.net', sender);
                                db.convs.set(data.conversation_id, cdt);
                                console.log2("Generat cod pentru `"+sender.nick+"`");
                            });
                        }).end();
                    }
                });
            });
        });
        req2.end();



    }
}
