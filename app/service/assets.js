// 七牛JDK
'use strict';

const Service = require('egg').Service;

class AssetsService extends Service {

    // init 初始化
    async list(pageNo, pageSize, team_code, assets_name, status) {
        pageSize = pageSize * 1;
        pageNo = pageNo * 1;
        const query = { $match: {} };
        if (team_code) query.$match.team_code = team_code;
        if (assets_name) query.$match.name = { $regex: new RegExp(assets_name) };
        if (status + '') query.$match.status = status * 1;
        const count = Promise.resolve(this.ctx.model.Assets.count(query.$match).exec());
        const datas = Promise.resolve(
            this.ctx.model.Assets.aggregate([
                query,
                {
                    $lookup: {
                        from: 'teams',
                        localField: 'team_code',
                        foreignField: 'code',
                        as: 'teamlist',
                    },
                },
                { $skip: (pageNo - 1) * pageSize },
                { $sort: { create_time: -1 } },
                { $limit: pageSize },
            ]).exec()
        );
        const all = await Promise.all([ count, datas ]);
        const [ totalNum, datalist ] = all;

        return {
            datalist,
            totalNum,
            pageNo,
        };
    }

    async all() {
        return this.ctx.model.Assets.aggregate([
            { $match: { status: 1 } },
            {
                $lookup: {
                    from: 'teams',
                    localField: 'team_code',
                    foreignField: 'code',
                    as: 'teamlist',
                },
            },
            { $sort: { count: -1 } },
        ]).exec();
    }

    // add | update
    async handle(json) {
        const { type, name, code, status, _id, team_code, outer_ip, lan_ip, user, port, password, user_name } = json;
        let result = '';
        if (type === 1) {
            // add
            const assets = this.ctx.model.Assets();
            assets.name = name;
            assets.code = code;
            assets.status = status;
            assets.team_code = team_code;
            assets.outer_ip = outer_ip;
            assets.lan_ip = lan_ip;
            assets.user = user;
            assets.user_name = user_name;
            assets.port = port;
            assets.password = password;
            assets.create_time = new Date();
            result = await assets.save();
        } else if (type === 2) {
            // update
            result = await this.ctx.model.Assets.update(
                { _id },
                { $set: { name, code, status, team_code, outer_ip, lan_ip, user, port, password, user_name } },
                { multi: true }
            );
        }
        return result;
    }

    // 设置状态
    async setStatus(json) {
        const { _id, status } = json;
        return await this.ctx.model.Assets.update({ _id }, { $set: { status } }, { multi: true });
    }

    // 删除
    async delete(_id) {
        return await this.ctx.model.Assets.remove({ _id });
    }

}

module.exports = AssetsService;
