#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PATCHES_DIR = path.join(__dirname, '../patches');
const PROJECT_ROOT = path.join(__dirname, '..');

console.log('🔧 应用中文支持补丁...\n');

const patches = [
    { file: 'i18n-index.patch', name: 'i18n index.ts' },
    { file: 'app-vue.patch', name: 'App.vue' },
    { file: 'settings-personal-view.patch', name: 'SettingsPersonalView.vue' },
    { file: 'enterprise-license.patch', name: 'Enterprise License Bypass' }
];

patches.forEach(({ file, name }) => {
    const patchPath = path.join(PATCHES_DIR, file);

    if (!fs.existsSync(patchPath)) {
        console.log(`⚠️  跳过: ${name} (补丁文件不存在)`);
        return;
    }

    console.log(`📝 应用补丁: ${name}`);

    try {
        // 检查补丁是否可以应用
        execSync(`git apply --check "${patchPath}"`, {
            cwd: PROJECT_ROOT,
            stdio: 'pipe'
        });

        // 应用补丁
        execSync(`git apply "${patchPath}"`, {
            cwd: PROJECT_ROOT
        });

        console.log(`   ✅ 成功\n`);
    } catch (error) {
        console.log(`   ⚠️  已应用或冲突，跳过\n`);
    }
});

console.log('✅ 所有补丁应用完成！');
