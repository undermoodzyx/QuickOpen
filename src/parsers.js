const fs = require('fs')
const path = require('path')
const xmlParser = require('../lib/parser')
const config = require('./config')

const ideNames = Object.keys(config.executableFile)

// 过去 ide 的名称
function getJetBrainsIdeName(fileName) {
    let ideName = "";
    for (const item of ideNames) {
        if (fileName.toLowerCase().indexOf(item) !== -1) {
            ideName = item
            break
        }
    }
    return ideName
}


// 获取可执行文件的绝对路径
function getExecutableFile(key) {
    return config.executableFile[key]
}


// 获取 icon
function getIcon(key) {
    return config.icons[key]
}


let parser = new xmlParser.Parser();

function jetBrainsParsers(fileName, deDuplication) {
    if (fileName.indexOf('xml') === -1) {
        return []
    }

    let projectList = []
    const ideName = getJetBrainsIdeName(fileName)
    const executableFile = getExecutableFile(ideName)
    const icon = getIcon(ideName)
    const data = fs.readFileSync(fileName)
    parser.parseString(data, function (err, result) {
        const component = result.application.component[0];
        const option =
            component.option[
                component.option.findIndex((item) => item.$.name == "additionalInfo") // 获取 name="additionalInfo" 的 option 元素
                ];
        option.map[0].entry.map((item) => {
            // const projectPath = item.$.key
            const projectPath = item.$.key.replace("$USER_HOME$", config.home)   // "$USER_HOME$" 得替换成用户的家目录
            const mark = ideName + projectPath
            if (deDuplication.indexOf(mark) === -1) {   // 过滤重复的记录
                const options = item.value[0].RecentProjectMetaInfo[0].option;
                deDuplication.push(mark)
                if (ideName === "datagrip") {
                    projectList.push({
                        ideName: ideName,
                        icon: icon,
                        executableFile: executableFile,
                        description: "datagrip 没有历史项目",
                        openTimestamp: options[options.findIndex((item) => item.$.name == "projectOpenTimestamp")].$.value, // 获取 name="projectOpenTimestamp" 的 option 元素的 value 值
                        title: "打开 datagrip"
                    });
                } else {
                    projectList.push({
                        ideName: ideName,
                        icon: icon,
                        executableFile: executableFile,
                        description: projectPath,
                        openTimestamp: options[options.findIndex((item) => item.$.name == "projectOpenTimestamp")].$.value, // 获取 name="projectOpenTimestamp" 的 option 元素的 value 值
                        title: path.basename(projectPath)
                    });
                }
            }
        });
    });
    // console.log(projectList)
    return projectList;
}


function vscodeParsers(fileName, deDuplication) {
    let data = fs.readFileSync(fileName)
    if (!data.length) {
        return
    }

    data = JSON.parse(data)
    const openedPathsList = data["openedPathsList"]
    const projects = openedPathsList["workspaces3"].concat(openedPathsList["files2"]) // 需清除掉 file://

    let projectList = []
    const ideName = "vscode"
    const executableFile = getExecutableFile(ideName)
    const icon = getIcon(ideName)
    projects.map((item) => {
        item = item.replace("file://", "")
        const mark = ideName + item
        if (deDuplication.indexOf(mark) === -1) {   // 过滤重复的记录
            deDuplication.push(mark)
            projectList.push({
                ideName: ideName,
                icon: icon,
                executableFile: executableFile,
                description: item,
                openTimestamp: 0,
                title: path.basename(item)
            });
        }
    })
    return projectList;
}


module.exports = {
    jetBrainsParsers,
    vscodeParsers
};


// jetBrainsParsers("/Users/joys/Library/Application\ Support/JetBrains/PyCharm2020.3/options/recentProjects.xml")
// vscodeParsers("/Users/joys/Library/Application\ Support/Code/storage.json", [])
