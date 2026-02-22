/**
 * Wiky.js - Javascript library to converts Wiki MarkUp language to HTML.
 * You can do whatever with it. Please give me some credits (Apache License)
 * - Tanin Na Nakorn
 * Modified for WikiBlueboop by Jules
 */

var wiky = {
    options: {
        'link-image': true
    }
}

wiky.process = function(wikitext, options) {
    wiky.options = options || wiky.options;
    var lines = wikitext.split(/\r?\n/);
    var html = "";

    for (var i=0; i<lines.length; i++) {
        var line = lines[i];
        if (line.match(/^===/)!=null && line.match(/===$/)!=null) {
            html += "<h2>"+line.substring(3,line.length-3)+"</h2>";
        } else if (line.match(/^==/)!=null && line.match(/==$/)!=null) {
            html += "<h3>"+line.substring(2,line.length-2)+"</h3>";
        } else if (line.match(/^:+/)!=null) {
            var start = i;
            while (i < lines.length && lines[i].match(/^\:+/)!=null) i++;
            i--;
            html += wiky.process_indent(lines,start,i);
        } else if (line.match(/^----+(\s*)$/)!=null) {
            html += "<hr/>";
        } else if (line.match(/^(\*+) /)!=null) {
            var start = i;
            while (i < lines.length && lines[i].match(/^(\*+|\#\#+)\:? /)!=null) i++;
            i--;
            html += wiky.process_bullet_point(lines,start,i);
        } else if (line.match(/^(\#+) /)!=null) {
            var start = i;
            while (i < lines.length && lines[i].match(/^(\#+|\*\*+)\:? /)!=null) i++;
            i--;
            html += wiky.process_bullet_point(lines,start,i);
        } else {
            html += wiky.process_normal(line);
        }
        html += "\n";
    }
    return html;
}

wiky.process_indent = function(lines,start,end) {
    var html = "<dl>";
    for(var i=start; i<=end; i++) {
        html += "<dd>";
        var this_count = lines[i].match(/^(\:+)/)[1].length;
        html += wiky.process_normal(lines[i].substring(this_count));
        var nested_end = i;
        for (var j=i+1; j<=end; j++) {
            var nested_count = lines[j].match(/^(\:+)/)[1].length;
            if (nested_count <= this_count) break;
            else nested_end = j;
        }
        if (nested_end > i) {
            html += wiky.process_indent(lines,i+1,nested_end);
            i = nested_end;
        }
        html += "</dd>";
    }
    html += "</dl>";
    return html;
}

wiky.process_bullet_point = function(lines,start,end) {
    var html = (lines[start].charAt(0)=='*')?"<ul>":"<ol>";
    html += '\n';
    for(var i=start; i<=end; i++) {
        html += "<li>";
        var this_count = lines[i].match(/^(\*+|\#+) /)[1].length;
        html += wiky.process_normal(lines[i].substring(this_count+1));

        var nested_end = i;
        for (var j = i + 1; j <= end; j++) {
            var match = lines[j].match(/^(\*+|\#+)\:? /);
            if (!match) break;
            var nested_count = match[1].length;
            if (nested_count < this_count) break;
            else {
                if (lines[j].charAt(nested_count) == ':') {
                    html += "<br/>" + wiky.process_normal(lines[j].substring(nested_count + 2));
                    nested_end = j;
                } else break;
            }
        }
        i = nested_end;

        var nested_end_bullet = i;
        for (var j = i + 1; j <= end; j++) {
            var match = lines[j].match(/^(\*+|\#+)\:? /);
            if (!match) break;
            var nested_count = match[1].length;
            if (nested_count <= this_count) break;
            else nested_end_bullet = j;
        }
        if (nested_end_bullet > i) {
            html += wiky.process_bullet_point(lines, i + 1, nested_end_bullet);
            i = nested_end_bullet;
        }
        html += "</li>\n";
    }
    html += (lines[start].charAt(0)=='*')?"</ul>":"</ol>";
    html += '\n';
    return html;
}

wiky.process_url = function(txt) {
    var index = txt.indexOf(" ");
    var url = txt, label = txt;
    if (index !== -1) {
        url = txt.substring(0, index);
        label = txt.substring(index + 1);
    }
    return '<a href="' + url + '">' + label + '</a>';
};

wiky.process_internal_link = function(txt) {
    var index = txt.indexOf("|");
    var target = txt, label = txt;
    if (index !== -1) {
        target = txt.substring(0, index);
        label = txt.substring(index + 1);
    }
    target = target.trim().replace(/ /g, "_");
    return '<a href="#/' + target + '">' + label + '</a>';
};

wiky.process_image = function(txt) {
    var parts = txt.split("|");
    var url = parts[0];
    var alt = parts[parts.length-1];
    return "<img src='"+url+"' alt=\""+alt+"\" style='max-width:100%; height:auto;' />";
}

wiky.process_normal = function(wikitext) {
    // Internal Link [[Target|Label]]
    var index = wikitext.indexOf("[[");
    var end_index = wikitext.indexOf("]]", index + 2);
    while (index > -1 && end_index > -1) {
        var content = wikitext.substring(index + 2, end_index);
        var replacement = "";
        if (content.startsWith("File:")) {
            replacement = wiky.process_image(content.substring(5));
        } else if (content.startsWith("Video:")) {
            replacement = wiky.process_video(content.substring(6));
        } else {
            replacement = wiky.process_internal_link(content);
        }
        wikitext = wikitext.substring(0, index) + replacement + wikitext.substring(end_index + 2);
        index = wikitext.indexOf("[[", index + replacement.length);
        end_index = wikitext.indexOf("]]", index + 2);
    }

    // URL [http://... Label]
    var protocols = ["http","https","ftp"];
    for (var i=0; i<protocols.length; i++) {
        var p_index = wikitext.indexOf("["+protocols[i]+"://");
        var p_end_index = wikitext.indexOf("]", p_index + 1);
        while (p_index > -1 && p_end_index > -1) {
            wikitext = wikitext.substring(0, p_index) + wiky.process_url(wikitext.substring(p_index+1, p_end_index)) + wikitext.substring(p_end_index+1);
            p_index = wikitext.indexOf("["+protocols[i]+"://", p_index + 1);
            p_end_index = wikitext.indexOf("]", p_index + 1);
        }
    }

    // Bold '''
    wikitext = wikitext.replace(/'''(.*?)'''/g, "<b>$1</b>");
    // Italic ''
    wikitext = wikitext.replace(/''(.*?)''/g, "<i>$1</i>");

    return wikitext;
}

wiky.process_video = function(url) {
    if (url.includes("youtube.com/watch?v=")) {
        var id = url.split("v=")[1].split("&")[0];
        url = "https://www.youtube.com/embed/" + id;
    }
    return '<iframe width="480" height="390" src="'+url+'" frameborder="0" allowfullscreen></iframe>';
}

if (typeof exports === 'object') {
    module.exports = wiky;
}
