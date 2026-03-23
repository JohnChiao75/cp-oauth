<template>
    <el-container class="auth-layout">
        <el-main class="auth-layout__main">
            <slot />
        </el-main>
    </el-container>
</template>

<style scoped lang="scss">
.auth-layout {
    min-height: 100vh;

    &__main {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        background: var(--bg-secondary);
    }
}

@media (max-width: 768px) {
    .auth-layout {
        &__main {
            padding: 24px 16px;
            align-items: flex-start;
            padding-top: 10vh;
        }
    }
}
</style>
