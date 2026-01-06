#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PROJECT_ROOT = path.join(__dirname, '..');
const LICENSE_FILE = path.join(PROJECT_ROOT, 'packages/cli/src/license.ts');

console.log('🔧 应用企业版许可证补丁（通用模式）...\n');

if (!fs.existsSync(LICENSE_FILE)) {
    console.error('❌ 找不到 license.ts 文件');
    process.exit(1);
}

// 读取文件
let content = fs.readFileSync(LICENSE_FILE, 'utf-8');
const originalContent = content;
let modified = false;

console.log('📝 分析 license.ts 文件...\n');

// ===== 修改 1: isLicensed() 方法 =====
console.log('🔍 处理 isLicensed() 方法...');

// 匹配整个方法
const isLicensedRegex = /(\tisLicensed\(feature: BooleanLicenseFeature\) \{)\n([\s\S]*?)(\n\t\})/;
const isLicensedMatch = content.match(isLicensedRegex);

if (isLicensedMatch) {
    let methodBody = isLicensedMatch[2];

    // 检查是否已经有完整的处理
    const hasEnvCheck = methodBody.includes('process.env.N8N_ENTERPRISE');
    const hasShowNonProdBanner = methodBody.includes('feat:showNonProdBanner');
    const hasApiDisabled = methodBody.includes('feat:apiDisabled');

    if (hasEnvCheck && hasShowNonProdBanner && hasApiDisabled) {
        console.log('   ✓ 已包含完整的环境变量处理\n');
    } else if (hasEnvCheck && !hasShowNonProdBanner && !hasApiDisabled) {
        // 有环境变量检查但缺少反向逻辑处理，需要添加
        console.log('   ⚙️  添加反向逻辑特性处理...');

        const newBody = methodBody.replace(
            /(if \(process\.env\.N8N_ENTERPRISE === 'true'\) \{)\n(\t\t\treturn true;)/,
            `$1
\t\t\t// SHOW_NON_PROD_BANNER 是反向逻辑特性，需要返回 false 来隐藏横幅
\t\t\tif (feature === 'feat:showNonProdBanner') {
\t\t\t\treturn false;
\t\t\t}
\t\t\t// API_DISABLED 是反向逻辑特性，需要返回 false 来启用 API
\t\t\tif (feature === 'feat:apiDisabled') {
\t\t\t\treturn false;
\t\t\t}
\t\t\treturn true;`
        );

        content = content.replace(isLicensedRegex, `$1\n${newBody}$3`);
        modified = true;
        console.log('   ✅ 已添加\n');
    } else {
        // 完全没有环境变量检查
        console.log('   ➕ 添加环境变量检查...');

        const newBody = `\t\t// 支持通过环境变量启用企业版功能
\t\tif (process.env.N8N_ENTERPRISE === 'true') {
\t\t\t// SHOW_NON_PROD_BANNER 是反向逻辑特性，需要返回 false 来隐藏横幅
\t\t\tif (feature === 'feat:showNonProdBanner') {
\t\t\t\treturn false;
\t\t\t}
\t\t\t// API_DISABLED 是反向逻辑特性，需要返回 false 来启用 API
\t\t\tif (feature === 'feat:apiDisabled') {
\t\t\t\treturn false;
\t\t\t}
\t\t\treturn true;
\t\t}
${methodBody}`;

        content = content.replace(isLicensedRegex, `$1\n${newBody}$3`);
        modified = true;
        console.log('   ✅ 已添加\n');
    }
} else {
    console.log('   ⚠️  找不到 isLicensed() 方法\n');
}

// ===== 修改 2: getValue() 方法 =====
console.log('🔍 处理 getValue() 方法...');

const getValueRegex = /(\tgetValue<T extends keyof FeatureReturnType>\(feature: T\): FeatureReturnType\[T\] \{)\n([\s\S]*?)(\n\t\})/;
const getValueMatch = content.match(getValueRegex);

if (getValueMatch) {
    let methodBody = getValueMatch[2];

    if (methodBody.includes('process.env.N8N_ENTERPRISE')) {
        console.log('   ✓ 已包含环境变量处理\n');
    } else {
        console.log('   ➕ 添加环境变量检查...');

        const newBody = `\t\t// 支持通过环境变量启用企业版功能
\t\tif (process.env.N8N_ENTERPRISE === 'true') {
\t\t\t// 对于配额相关的特性，返回无限配额
\t\t\tif (feature.toString().includes('Limit') || feature.toString().includes('LIMIT')) {
\t\t\t\treturn UNLIMITED_LICENSE_QUOTA as FeatureReturnType[T];
\t\t\t}
\t\t\t// 对于 planName，返回 'Enterprise'
\t\t\tif (feature === 'planName') {
\t\t\t\treturn 'Enterprise' as FeatureReturnType[T];
\t\t\t}
\t\t}
${methodBody}`;

        content = content.replace(getValueRegex, `$1\n${newBody}$3`);
        modified = true;
        console.log('   ✅ 已添加\n');
    }
} else {
    console.log('   ⚠️  找不到 getValue() 方法\n');
}

// ===== 修改 3: getPlanName() 方法 =====
console.log('🔍 处理 getPlanName() 方法...');

const getPlanNameRegex = /(\tgetPlanName\(\): string \{)\n([\s\S]*?)(\n\t\})/;
const getPlanNameMatch = content.match(getPlanNameRegex);

if (getPlanNameMatch) {
    let methodBody = getPlanNameMatch[2];

    if (methodBody.includes('process.env.N8N_ENTERPRISE')) {
        console.log('   ✓ 已包含环境变量处理\n');
    } else {
        console.log('   ➕ 添加环境变量检查...');

        const newBody = `\t\t// 支持通过环境变量启用企业版功能
\t\tif (process.env.N8N_ENTERPRISE === 'true') {
\t\t\treturn 'Enterprise';
\t\t}
${methodBody}`;

        content = content.replace(getPlanNameRegex, `$1\n${newBody}$3`);
        modified = true;
        console.log('   ✅ 已添加\n');
    }
} else {
    console.log('   ⚠️  找不到 getPlanName() 方法\n');
}

// 保存修改
if (modified) {
    fs.writeFileSync(LICENSE_FILE, content, 'utf-8');
    console.log('✅ 成功应用企业版许可证补丁！\n');
    console.log('📊 修改内容:');
    console.log('   ✓ isLicensed(): 支持反向逻辑特性 (SHOW_NON_PROD_BANNER, API_DISABLED)');
    console.log('   ✓ getValue(): 支持无限配额和企业版计划名');
    console.log('   ✓ getPlanName(): 返回 Enterprise\n');
    console.log('💡 查看修改: git diff packages/cli/src/license.ts');
} else {
    console.log('✓ 所有修改已存在，无需更新\n');
}
