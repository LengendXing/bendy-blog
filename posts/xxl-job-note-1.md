# XXL-JOB速解

这篇记录是最近翻阅刚毕业那会的笔记发现的，现在贴上来了。

## XXL-Job：调度器-节点部署

### 1.1 初始化数据库

```sql
      
#
# XXL-JOB
# Copyright (c) 2015-present, xuxueli.

CREATE database if NOT EXISTS `xxl_job` default character set utf8mb4 collate utf8mb4_unicode_ci;
use `xxl_job`;

SET NAMES utf8mb4;

CREATE TABLE `xxl_job_info`
(
    `id`                        int(11)      NOT NULL AUTO_INCREMENT,
    `job_group`                 int(11)      NOT NULL COMMENT '执行器主键ID',
    `job_desc`                  varchar(255) NOT NULL,
    `add_time`                  datetime              DEFAULT NULL,
    `update_time`               datetime              DEFAULT NULL,
    `author`                    varchar(64)           DEFAULT NULL COMMENT '作者',
    `alarm_email`               varchar(255)          DEFAULT NULL COMMENT '报警邮件',
    `schedule_type`             varchar(50)  NOT NULL DEFAULT 'NONE' COMMENT '调度类型',
    `schedule_conf`             varchar(128)          DEFAULT NULL COMMENT '调度配置，值含义取决于调度类型',
    `misfire_strategy`          varchar(50)  NOT NULL DEFAULT 'DO_NOTHING' COMMENT '调度过期策略',
    `executor_route_strategy`   varchar(50)           DEFAULT NULL COMMENT '执行器路由策略',
    `executor_handler`          varchar(255)          DEFAULT NULL COMMENT '执行器任务handler',
    `executor_param`            varchar(512)          DEFAULT NULL COMMENT '执行器任务参数',
    `executor_block_strategy`   varchar(50)           DEFAULT NULL COMMENT '阻塞处理策略',
    `executor_timeout`          int(11)      NOT NULL DEFAULT '0' COMMENT '任务执行超时时间，单位秒',
    `executor_fail_retry_count` int(11)      NOT NULL DEFAULT '0' COMMENT '失败重试次数',
    `glue_type`                 varchar(50)  NOT NULL COMMENT 'GLUE类型',
    `glue_source`               mediumtext COMMENT 'GLUE源代码',
    `glue_remark`               varchar(128)          DEFAULT NULL COMMENT 'GLUE备注',
    `glue_updatetime`           datetime              DEFAULT NULL COMMENT 'GLUE更新时间',
    `child_jobid`               varchar(255)          DEFAULT NULL COMMENT '子任务ID，多个逗号分隔',
    `trigger_status`            tinyint(4)   NOT NULL DEFAULT '0' COMMENT '调度状态：0-停止，1-运行',
    `trigger_last_time`         bigint(13)   NOT NULL DEFAULT '0' COMMENT '上次调度时间',
    `trigger_next_time`         bigint(13)   NOT NULL DEFAULT '0' COMMENT '下次调度时间',
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `xxl_job_log`
(
    `id`                        bigint(20) NOT NULL AUTO_INCREMENT,
    `job_group`                 int(11)    NOT NULL COMMENT '执行器主键ID',
    `job_id`                    int(11)    NOT NULL COMMENT '任务，主键ID',
    `executor_address`          varchar(255)        DEFAULT NULL COMMENT '执行器地址，本次执行的地址',
    `executor_handler`          varchar(255)        DEFAULT NULL COMMENT '执行器任务handler',
    `executor_param`            varchar(512)        DEFAULT NULL COMMENT '执行器任务参数',
    `executor_sharding_param`   varchar(20)         DEFAULT NULL COMMENT '执行器任务分片参数，格式如 1/2',
    `executor_fail_retry_count` int(11)    NOT NULL DEFAULT '0' COMMENT '失败重试次数',
    `trigger_time`              datetime            DEFAULT NULL COMMENT '调度-时间',
    `trigger_code`              int(11)    NOT NULL COMMENT '调度-结果',
    `trigger_msg`               text COMMENT '调度-日志',
    `handle_time`               datetime            DEFAULT NULL COMMENT '执行-时间',
    `handle_code`               int(11)    NOT NULL COMMENT '执行-状态',
    `handle_msg`                text COMMENT '执行-日志',
    `alarm_status`              tinyint(4) NOT NULL DEFAULT '0' COMMENT '告警状态：0-默认、1-无需告警、2-告警成功、3-告警失败',
    PRIMARY KEY (`id`),
    KEY `I_trigger_time` (`trigger_time`),
    KEY `I_handle_code` (`handle_code`),
    KEY `I_jobid_jobgroup` (`job_id`,`job_group`),
    KEY `I_job_id` (`job_id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `xxl_job_log_report`
(
    `id`            int(11) NOT NULL AUTO_INCREMENT,
    `trigger_day`   datetime         DEFAULT NULL COMMENT '调度-时间',
    `running_count` int(11) NOT NULL DEFAULT '0' COMMENT '运行中-日志数量',
    `suc_count`     int(11) NOT NULL DEFAULT '0' COMMENT '执行成功-日志数量',
    `fail_count`    int(11) NOT NULL DEFAULT '0' COMMENT '执行失败-日志数量',
    `update_time`   datetime         DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `i_trigger_day` (`trigger_day`) USING BTREE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `xxl_job_logglue`
(
    `id`          int(11)      NOT NULL AUTO_INCREMENT,
    `job_id`      int(11)      NOT NULL COMMENT '任务，主键ID',
    `glue_type`   varchar(50) DEFAULT NULL COMMENT 'GLUE类型',
    `glue_source` mediumtext COMMENT 'GLUE源代码',
    `glue_remark` varchar(128) NOT NULL COMMENT 'GLUE备注',
    `add_time`    datetime    DEFAULT NULL,
    `update_time` datetime    DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `xxl_job_registry`
(
    `id`             int(11)      NOT NULL AUTO_INCREMENT,
    `registry_group` varchar(50)  NOT NULL,
    `registry_key`   varchar(255) NOT NULL,
    `registry_value` varchar(255) NOT NULL,
    `update_time`    datetime DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `i_g_k_v` (`registry_group`, `registry_key`, `registry_value`) USING BTREE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `xxl_job_group`
(
    `id`           int(11)     NOT NULL AUTO_INCREMENT,
    `app_name`     varchar(64) NOT NULL COMMENT '执行器AppName',
    `title`        varchar(12) NOT NULL COMMENT '执行器名称',
    `address_type` tinyint(4)  NOT NULL DEFAULT '0' COMMENT '执行器地址类型：0=自动注册、1=手动录入',
    `address_list` text COMMENT '执行器地址列表，多地址逗号分隔',
    `update_time`  datetime             DEFAULT NULL,
    PRIMARY KEY (`id`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `xxl_job_user`
(
    `id`         int(11)     NOT NULL AUTO_INCREMENT,
    `username`   varchar(50) NOT NULL COMMENT '账号',
    `password`   varchar(50) NOT NULL COMMENT '密码',
    `role`       tinyint(4)  NOT NULL COMMENT '角色：0-普通用户、1-管理员',
    `permission` varchar(255) DEFAULT NULL COMMENT '权限：执行器ID列表，多个逗号分割',
    PRIMARY KEY (`id`),
    UNIQUE KEY `i_username` (`username`) USING BTREE
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

CREATE TABLE `xxl_job_lock`
(
    `lock_name` varchar(50) NOT NULL COMMENT '锁名称',
    PRIMARY KEY (`lock_name`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4;

## —————————————————————— init data ——————————————————

INSERT INTO `xxl_job_group`(`id`, `app_name`, `title`, `address_type`, `address_list`, `update_time`)
VALUES (1, 'xxl-job-executor-sample', '示例执行器', 0, NULL, '2018-11-03 22:21:31');

INSERT INTO `xxl_job_info`(`id`, `job_group`, `job_desc`, `add_time`, `update_time`, `author`, `alarm_email`,
                           `schedule_type`, `schedule_conf`, `misfire_strategy`, `executor_route_strategy`,
                           `executor_handler`, `executor_param`, `executor_block_strategy`, `executor_timeout`,
                           `executor_fail_retry_count`, `glue_type`, `glue_source`, `glue_remark`, `glue_updatetime`,
                           `child_jobid`)
VALUES (1, 1, '测试任务1', '2018-11-03 22:21:31', '2018-11-03 22:21:31', 'XXL', '', 'CRON', '0 0 0 * * ? *',
        'DO_NOTHING', 'FIRST', 'demoJobHandler', '', 'SERIAL_EXECUTION', 0, 0, 'BEAN', '', 'GLUE代码初始化',
        '2018-11-03 22:21:31', '');

INSERT INTO `xxl_job_user`(`id`, `username`, `password`, `role`, `permission`)
VALUES (1, 'admin', 'e10adc3949ba59abbe56e057f20f883e', 1, NULL);

INSERT INTO `xxl_job_lock` (`lock_name`)
VALUES ('schedule_lock');

commit;
```

### **1.2 修改调度器项目配置**

```yaml
### web
server.port=6868
server.servlet.context-path=/xxl-job-admin

### actuator
management.server.base-path=/actuator
management.health.mail.enabled=false

### resources
spring.mvc.servlet.load-on-startup=0
spring.mvc.static-path-pattern=/static/**
spring.web.resources.static-locations=classpath:/static/

### freemarker
spring.freemarker.templateLoaderPath=classpath:/templates/
spring.freemarker.suffix=.ftl
spring.freemarker.charset=UTF-8
spring.freemarker.request-context-attribute=request
spring.freemarker.settings.number_format=0.##########
spring.freemarker.settings.new_builtin_class_resolver=safer

### mybatis
mybatis.mapper-locations=classpath:/mybatis-mapper/*Mapper.xml

### datasource-pool
spring.datasource.type=com.zaxxer.hikari.HikariDataSource
spring.datasource.hikari.minimum-idle=10
spring.datasource.hikari.maximum-pool-size=30
spring.datasource.hikari.auto-commit=true
spring.datasource.hikari.idle-timeout=30000
spring.datasource.hikari.pool-name=HikariCP
spring.datasource.hikari.max-lifetime=900000
spring.datasource.hikari.connection-timeout=10000
spring.datasource.hikari.connection-test-query=SELECT 1
spring.datasource.hikari.validation-timeout=1000

### xxl-job, datasource
spring.datasource.url=jdbc:mysql://127.0.0.1:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
#spring.datasource.url=jdbc:mysql://127.0.0.1:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
spring.datasource.username=root
spring.datasource.password=root
#spring.datasource.password=root
spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver

### xxl-job, email
spring.mail.from=
spring.mail.port=
spring.mail.host=
spring.mail.username=
spring.mail.password=
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
spring.mail.properties.mail.smtp.starttls.required=true
spring.mail.properties.mail.smtp.socketFactory.class=javax.net.ssl.SSLSocketFactory

### xxl-job, access token
xxl.job.accessToken=

### xxl-job, access token
xxl.job.timeout=3

### xxl-job, i18n (default is zh_CN, and you can choose "zh_CN", "zh_TC" and "en")
xxl.job.i18n=zh_CN

## xxl-job, triggerpool max size
xxl.job.triggerpool.fast.max=200
xxl.job.triggerpool.slow.max=100

### xxl-job, log retention days
xxl.job.logretentiondays=30

### xxl-job feishu notify
xxl.job.feishu.notify.enable=true
xxl.job.feishu.notify.url=https://open.feishu.cn/open-apis/bot/v2/hook/22dd3e7e-e6d7-4893-8a38-d99f0e51967b
```

**或者换成Yaml配置**

```yaml
server:
  port: 6868
  servlet:
    context-path: /xxl-job-admin

management:
  server:
    base-path: /actuator
  health:
    mail:
      enabled: false

spring:
  mvc:
    servlet:
      load-on-startup: 0
    static-path-pattern: /static/**
  web:
    resources:
      static-locations: classpath:/static/
  freemarker:
    templateLoaderPath: classpath:/templates/
    suffix: .ftl
    charset: UTF-8
    request-context-attribute: request
    settings:
      number_format: 0.##########
      new_builtin_class_resolver: safer
  datasource:
    type: com.zaxxer.hikari.HikariDataSource
    url: jdbc:mysql://127.0.0.1:3306/xxl_job?useUnicode=true&characterEncoding=UTF-8&autoReconnect=true&serverTimezone=Asia/Shanghai
    username: root
    password: XXXXX
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      minimum-idle: 10
      maximum-pool-size: 30
      auto-commit: true
      idle-timeout: 30000
      pool-name: HikariCP
      max-lifetime: 900000
      connection-timeout: 10000
      connection-test-query: SELECT 1
      validation-timeout: 1000
  mail:
    from:
    port:
    host:
    username:
    password:
    properties:
      mail:
        smtp:
          auth: true
          starttls:
            enable: true
            required: true
          socketFactory:
            class: javax.net.ssl.SSLSocketFactory

mybatis:
  mapper-locations: classpath:/mybatis-mapper/*Mapper.xml

xxl:
  job:
    accessToken:
    timeout: 3
    i18n: zh_CN
    triggerpool:
      fast:
        max: 200
      slow:
        max: 100
    logretentiondays: 30
    feishu:
      notify:
        enable: true
        url: https://open.feishu.cn/open-apis/bot/v2/hook/XXXXXXXX
```

### **1.3 maven 打包源代码**

![image.png](XXL-Job%E5%AE%9E%E8%B7%B5%E4%B8%8E%E6%BA%90%E7%A0%81%E5%A2%9E%E5%BC%BA%E5%AE%9E%E8%B7%B5/image.png)

### 1.4 打包Docker镜像

dockerFile：

```yaml
#FROM openjdk:21-jdk-slim
FROM openjdk:17-jdk-slim

MAINTAINER xuxueli

ENV PARAMS=""

ENV TZ=PRC
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ADD target/xxl-job-admin-*.jar /app.jar

ENTRYPOINT ["sh","-c","java -jar $JAVA_OPTS /app.jar $PARAMS"]
```

上传文件至服务器

![image.png](XXL-Job%E5%AE%9E%E8%B7%B5%E4%B8%8E%E6%BA%90%E7%A0%81%E5%A2%9E%E5%BC%BA%E5%AE%9E%E8%B7%B5/image%201.png)

**之后执行打包镜像**

```yaml
docker build -t xxl-job:3.0.0 .
```

![image.png](XXL-Job%E5%AE%9E%E8%B7%B5%E4%B8%8E%E6%BA%90%E7%A0%81%E5%A2%9E%E5%BC%BA%E5%AE%9E%E8%B7%B5/image%202.png)

### **1.5 启动实例**

```yaml
docker run -d -p 6868:6868 --name xxl-job-admin xxl-job:3.0.0
```

## XXL-Job：执行器-服务接入

任意项目接入XXL—job十分简单，只需要按照如下步骤流程即可。

前置条件：打包 xxl-job-core 为jar包，私服部署Maven仓库，在对应的module引入此依赖：

```
<!-- xxl-job-core -->
<dependency>
    <groupId>com.xuxueli</groupId>
    <artifactId>xxl-job-core</artifactId>
    <version>3.0.0</version>
</dependency>

```

如果项目结构层次分明，对基础配置有明确的分包处理，那么你可以新建一个模块：

### 1.1 修改Yaml配置

```
server:
  port: 8081

# no web
#spring:
#  main:
#    web-environment: false

logging:
  config: classpath:logback.xml

xxl:
  job:
    admin:
      addresses: http://127.0.0.1:6868/xxl-job-admin
      accessToken:
      timeout: 3
    executor:
      appname: doc-project-server
      address:
      ip:
      port: 19999
      logpath: /home/software/xxl-job/logs
      logretentiondays: 30

```

### 1.2 配置类

```java
import com.xxl.job.core.executor.XxlJobExecutor;
import com.xxl.job.core.executor.impl.XxlJobSpringExecutor;
import com.xxl.job.executor.service.jobhandler.TestJobHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class XxlJobConfig {
    private Logger logger = LoggerFactory.getLogger(XxlJobConfig.class);

    @Value("${xxl.job.admin.addresses}")
    private String adminAddresses;

    @Value("${xxl.job.admin.accessToken}")
    private String accessToken;

    @Value("${xxl.job.admin.timeout}")
    private int timeout;

    @Value("${xxl.job.executor.appname}")
    private String appname;

    @Value("${xxl.job.executor.address}")
    private String address;

    @Value("${xxl.job.executor.ip}")
    private String ip;

    @Value("${xxl.job.executor.port}")
    private int port;

    @Value("${xxl.job.executor.logpath}")
    private String logPath;

    @Value("${xxl.job.executor.logretentiondays}")
    private int logRetentionDays;

    @Bean
    public XxlJobSpringExecutor xxlJobExecutor() {
        logger.info("xxl-job config init.");
        XxlJobSpringExecutor xxlJobSpringExecutor = new XxlJobSpringExecutor();
        xxlJobSpringExecutor.setAdminAddresses(adminAddresses);
        xxlJobSpringExecutor.setAppname(appname);
        xxlJobSpringExecutor.setAddress(address);
        xxlJobSpringExecutor.setIp(ip);
        xxlJobSpringExecutor.setPort(port);
        xxlJobSpringExecutor.setAccessToken(accessToken);
        xxlJobSpringExecutor.setTimeout(timeout);
        xxlJobSpringExecutor.setLogPath(logPath);
        xxlJobSpringExecutor.setLogRetentionDays(logRetentionDays);
        return xxlJobSpringExecutor;
    }
		/**
		 * 针对多网卡、容器内部署等情况，可借助 {@code spring-cloud-commons} 提供的 {@code InetUtils} 组件灵活定制注册 IP。
		 *
		 * 1. 引入依赖：
		 * <pre>{@code
		 * <dependency>
		 *     <groupId>org.springframework.cloud</groupId>
		 *     <artifactId>spring-cloud-commons</artifactId>
		 *     <version>${version}</version>
		 * </dependency>
		 * }</pre>
		 *
		 * 2. 配置文件，或容器启动变量：
		 * <pre>{@code
		 * spring.cloud.inetutils.preferred-networks: 'xxx.xxx.xxx.'
		 * }</pre>
		 *
		 * 3. 获取 IP：
		 * <pre>{@code
		 * String ip = inetUtils.findFirstNonLoopbackHostInfo().getIpAddress();
		 * }</pre>
		 */
}

```

### 1.3 创建定时任务

### 1.3.1 编码+配置（SpringBoot3.X版本 & XXL-Job3.X版本）

先创建一个Handler继承IJobHandler，实现execute函数即可

```java
import com.xxl.job.core.handler.IJobHandler;
import org.springframework.stereotype.Component;

@Component
public class TestJobHandler extends IJobHandler {

		@Override
    public void execute() throws Exception {
        System.out.println("testJobHandler");
    }
}

```

由于Handler需要统一经过XxlJobExecutor处理，因此需要加入到配置中，上面的1.2 配置类需要增加一行代码（绿色标记就是需要新增的代码部分）

```java

import com.xxl.job.core.executor.XxlJobExecutor;
import com.xxl.job.core.executor.impl.XxlJobSpringExecutor;
import com.xxl.job.executor.service.jobhandler.TestJobHandler;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

public class ConfigurationpublicclassXxlJobConfig {
    private Logger logger = LoggerFactory.getLogger(XxlJobConfig.class);
    @Value("${xxl.job.admin.addresses}")
    privateString adminAddresses;
    @Value("${xxl.job.admin.accessToken}")
    privateString accessToken;
    @Value("${xxl.job.admin.timeout}")
    private int timeout;
    @Value("${xxl.job.executor.appname}")
    privateString appname;
    @Value("${xxl.job.executor.address}")
    privateString address;
    @Value("${xxl.job.executor.ip}")
    privateString ip;
    @Value("${xxl.job.executor.port}")
    private int port;
    @Value("${xxl.job.executor.logpath}")
    privateString logPath;
    @Value("${xxl.job.executor.logretentiondays}")
    private int logRetentionDays;
    @BeanpublicXxlJobSpringExecutorxxlJobExecutor() {
        logger.info("xxl-job config init.");
        XxlJobSpringExecutor xxlJobSpringExecutor = newXxlJobSpringExecutor();
        xxlJobSpringExecutor.setAdminAddresses(adminAddresses);
        xxlJobSpringExecutor.setAppname(appname);
        xxlJobSpringExecutor.setAddress(address);
        xxlJobSpringExecutor.setIp(ip);
        xxlJobSpringExecutor.setPort(port);
        xxlJobSpringExecutor.setAccessToken(accessToken);
        xxlJobSpringExecutor.setTimeout(timeout);
        xxlJobSpringExecutor.setLogPath(logPath);
        xxlJobSpringExecutor.setLogRetentionDays(logRetentionDays);
        XxlJobExecutor.registJobHandler("testJobHandler", new TestJobHandler());
        return xxlJobSpringExecutor;
    }
}
```

### 1.3.2 注解开发

注解开发更简单，使用Component注解标记为SpringBean之后，使用XxlJob注解标记方法为定时任务函数

```java
import com.xxl.job.core.handler.annotation.XxlJob;
import org.springframework.stereotype.Component;

/**
 * @author fntp 
 * @description 
 * @date 2025-06-24 9:20
 */
@Component
public class TestJobHandler {

    @XxlJob("testJobHandler")
    public void execute() {
        System.out.println("testJobHandler");
    }
}

```

### 1.4 启动项目服务

看到xxl-job注册到admin中心之后就说明配置成功

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=NzdhNTAwZDUzNjhhYjJkNzM0YWE4NDBiYjhmNjA5ZGNfU2t6SHhsN1lJc1U4OWEyT2Y5c0pPaW9zYXF4Nzl0YW5fVG9rZW46TUpMTmJZODB5b2F1Tk94bzdmRWNHaERXbm5kXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

打开分布式任务调度平台后台管理页面：http://127.0.0.1:6868/xxl-job-admin/

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=N2Q4NWMyZWNjNWY4ZDg2YmM0Zjc1NDU2ZTMzY2MzMmZfNWhTYjFjTWw5NGxocEVIQ2JtZDA1SnRJamVqckJpZU1fVG9rZW46R3VZUWIzUGxSb1lYS1R4SlF5OWNBbldmbkdkXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

### 1.5 新增执行器

点击执行器管理，新增执行器，选择自动注册，手动录入需要知道机器IP，自动注册，只需填写项目配置中的AppName即可，名称随意，填入一个项目别称即可，便于区分，自动注册会自动获取对应服务的IP。比如我这里是XXX-project-server，AppName就填入XXX-project-server。

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=OTlkMGE0YTc3NDk4YWUyOThhZDc0MGZhZmQ0NDMxYjFfZ1RzVTIwZE12NVJ1eVRmUEpJYU0zbWl5UlpmSHpYRVpfVG9rZW46Q2kyQmIyY21kb2Y1akp4S3J6TWNRWjlrbkNoXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

之后就创建成功了，点击查看，可以看到已经有注册进去的IP机器，分布式集群部署的时候，会有多个IP

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=NGI3YzE0YmJhMTY0OTFiZjgyNzE5ZDFhMjE4MmY2MzJfbW5rUUNtbW83NTFnR3hBSmZHaGtScmtjbkpKM0pNckhfVG9rZW46VkYzd2JxT0JLb1BVYzR4T1JESmNXaWN4bm9TXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

### 1.6 任务管理

新增定时任务，按照项目配置中的代码中所编写的JobHandler

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=OWU5MjZlYjY3MTM5OWZiMzc0YjNjMjkxYjkzNGY3NTNfdDgzUUZEMTJsNTZ4ZmZ6bHFJRjFPcW9MTlNFQTkxQTBfVG9rZW46R1htNmJNU0x5bzA3UXN4Ukc4aGNMRDBZbllmXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

这样就创建好了一个任务

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=ZjQxY2VhNTM4MGM1NzRhYTVjYTZhODU5Yjk3OGVkMTBfa0QwTER5Rm85UnZIZWFRR3JMbElHWlNhVHFvR2dNUGdfVG9rZW46WGZoYmJEUlNrb2pZV0V4SFVPeWNJWWk5blNoXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=MThlODA4YTlmNWNjNmU3YTI0ZjdiMDRjY2QzZjBkNTFfODJYbklMdDh0OEFNTHJ0SHhWejFwWWZGOVdmdjhCcDdfVG9rZW46R3VQemJSMmNNb2x0Z094eUxpRGNYZ1RubkxmXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

### 1.7 启动服务

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=YzBhZDBiNTUyMjM4MzdmNzZkNzQxOTAyYmE5YmQ2YTVfaTYyVXpCbVNVTnVpU2dOZENCMU0xblREZXE5eEpWamVfVG9rZW46QUcycmJWV0pqb0FCUXN4djNxVWNGMTJvblZiXzE3NTg4NjU4OTg6MTc1ODg2OTQ5OF9WNA)

## XXL-Job：自定义-监控实现

### 1.1 飞书消息卡片设计地址

https://open.feishu.cn/cardkit/editor?cardId=XXXXXXX

### 1.2 消息数据结构

```
{"msg_type": "interactive",
          "card": {
    "schema": "2.0",
    "config": {
        "update_multi": true,
        "style": {
            "text_size": {
                "normal_v2": {
                    "default": "normal",
                    "pc": "normal",
                    "mobile": "heading"
                }
            }
        }
    },
    "body": {
        "direction": "vertical",
        "padding": "12px 12px 12px 12px",
        "elements": [
            {
                "tag": "img",
                "img_key": "img_XXXXXXX",
                "preview": true,
                "transparent": false,
                "scale_type": "fit_horizontal",
                "margin": "0px 0px 0px 0px"
            },
            {
                "tag": "hr",
                "margin": "0px 0px 0px 0px"
            },
            {
                "tag": "div",
                "text": {
                    "tag": "plain_text",
                    "content": "示例文本",
                    "text_size": "normal_v2",
                    "text_align": "left",
                    "text_color": "default"
                },
                "margin": "0px 0px 0px 0px"
            },
            {
                "tag": "markdown",
                "content": "飞书emoji :OK::THUMBSUP:\n",
                "text_align": "left",
                "text_size": "normal_v2",
                "margin": "0px 0px 0px 0px"
            },
            {
                "tag": "div",
                "text": {
                    "tag": "plain_text",
                    "content": "示例文本",
                    "text_size": "normal_v2",
                    "text_align": "left",
                    "text_color": "default"
                },
                "margin": "0px 0px 0px 0px"
            },
            {
                "tag": "div",
                "text": {
                    "tag": "plain_text",
                    "content": "示例文本",
                    "text_size": "normal_v2",
                    "text_align": "left",
                    "text_color": "default"
                },
                "margin": "0px 0px 0px 0px"
            },
            {
                "tag": "div",
                "text": {
                    "tag": "plain_text",
                    "content": "示例文本",
                    "text_size": "normal_v2",
                    "text_align": "left",
                    "text_color": "default"
                },
                "margin": "0px 0px 0px 0px"
            }
        ]
    }
}}

```

### 1.3 消息Demo

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=MjBiYmMzYzI3N2VkOGMxMDAzZTk3MTJiODdjMDVhMzJfUE94ZWRMc3lJS3BXWmNjaEhYdzczdVRyenhnRnpOR1pfVG9rZW46RmphbWJUaGFSb1Z0UGl4RFZEc2NwV0x6bmNkXzE3NTg4NjYzNjY6MTc1ODg2OTk2Nl9WNA)

![image.png](XXL-Job%E5%AE%9E%E8%B7%B5%E4%B8%8E%E6%BA%90%E7%A0%81%E5%A2%9E%E5%BC%BA%E5%AE%9E%E8%B7%B5/image%203.png)

### 1.4 编码增强

xxl-job没有默认支持飞书通知，要想支持飞书通知，只需要分析一下源码，在Core中，有一个告警调用链路，其中JobAlarm接口，当出现需要告警的内容的时候，调用链路最终会调用这个JobAlarm的实现类，默认实现类是EmailAlarm，如果想自定义，就实现这个接口即可，具体实现位置在：

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=OGE4YmI0MmVkZTU0NWIyNzI1MDViMzBjN2E0YmViMzZfQm9qRDdvdWxQSGg0UElGYmlMaUZYbmVicDRHNG81UG5fVG9rZW46VHE2c2J0OFZWb3ZOM1N4VXR6S2NKRzZjbnFyXzE3NTg4NjYzNjY6MTc1ODg2OTk2Nl9WNA)

然后做自定义实现即可，给出一个demo案例：

```java
package com.xxl.job.admin.service.impl;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.xxl.job.admin.core.alarm.JobAlarm;
import com.xxl.job.admin.core.model.XxlJobInfo;
import com.xxl.job.admin.core.model.XxlJobLog;
import com.xxl.job.core.biz.model.ReturnT;
import com.xxl.job.core.util.DateUtil;
import org.apache.groovy.parser.antlr4.util.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.xxl.job.admin.core.util.FeiShuUtil;

import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * @author scx65229
 * @description xxl-job支持飞书告警
 * @date 2025-06-23 14:49
 */
@Service
@SuppressWarnings("all")
public class JobFeiShuAlarmImpl implements JobAlarm {

    @Value("${xxl.job.feishu.notify.url:https://open.feishu.cn/open-apis/bot/v2/hook/22dd3e7e-e6d7-4893-8a38-d99f0e51967b}")
    private String alarmUrl;

    @Value("${xxl.job.feishu.notify.enable:false}")
    private boolean enableToAlarm;

    private static final String DEFAULT_MESSAGE_TEMPLATE = "{\"msg_type\": \"interactive\", \"card\": {\"schema\": \"2.0\", \"config\": {\"update_multi\": true, \"style\": {\"text_size\": {\"normal_v2\": {\"default\": \"normal\", \"pc\": \"normal\", \"mobile\": \"heading\"}}}}, \"body\": {\"direction\": \"vertical\", \"padding\": \"12px 12px 12px 12px\", \"elements\": [{\"tag\": \"img\", \"img_key\": \"img_XXX\", \"preview\": true, \"transparent\": false, \"scale_type\": \"fit_horizontal\", \"margin\": \"0px 0px 0px 0px\"}, {\"tag\": \"hr\", \"margin\": \"0px 0px 0px 0px\"}, {\"tag\": \"div\", \"text\": {\"tag\": \"plain_text\", \"content\": \"XXXX系统定时任务执行通知\", \"text_size\": \"heading\", \"text_align\": \"left\", \"text_color\": \"default\"}, \"margin\": \"0px 0px 0px 0px\"}, {\"tag\": \"div\", \"text\": {\"tag\": \"plain_text\", \"content\": \"执行时间：$excuteTime\", \"text_size\": \"normal_v2\", \"text_align\": \"left\", \"text_color\": \"default\"}, \"margin\": \"0px 0px 0px 0px\"}, {\"tag\": \"div\", \"text\": {\"tag\": \"plain_text\", \"content\": \"触发任务：$excuteTask\", \"text_size\": \"normal_v2\", \"text_align\": \"left\", \"text_color\": \"default\"}, \"margin\": \"0px 0px 0px 0px\"}, {\"tag\": \"markdown\", \"content\": \"执行结果：$excuteResult\", \"text_align\": \"left\", \"text_size\": \"normal_v2\", \"margin\": \"0px 0px 0px 0px\"}, {\"tag\": \"div\", \"text\": {\"tag\": \"plain_text\", \"content\": \"执行日志：$excuteLog\", \"text_size\": \"normal_v2\", \"text_align\": \"left\", \"text_color\": \"default\"}, \"margin\": \"0px 0px 0px 0px\"},{\"tag\": \"div\", \"text\": {\"tag\": \"plain_text\", \"content\": \"执行机器：$excuteAddress\", \"text_size\": \"normal_v2\", \"text_align\": \"left\", \"text_color\": \"default\"}, \"margin\": \"0px 0px 0px 0px\"}]}}}";

    private static final Logger log = LoggerFactory.getLogger(JobFeiShuAlarmImpl.class.getName());

    /**
     * job alarm
     *
     * @param info
     * @param jobLog
     * @return
     */
    @Override
    public boolean doAlarm(XxlJobInfo info, XxlJobLog jobLog) {
        log.info("job alarm with feishu {} {}", JSON.toJSONString(info), JSON.toJSONString(jobLog));
        if (enableToAlarm) {
            try {
                Date triggerTime = jobLog.getTriggerTime();
                String triggerTimeStr;
                try {
                    triggerTimeStr = DateUtil.format(triggerTime, "yyyy-MM-dd HH:mm:ss");
                } catch (Exception e) {
                    triggerTimeStr = DateUtil.formatDate(triggerTime);
                }
                Map<String, String> variables = new HashMap<>();
                variables.put("excuteTime", StringUtils.isEmpty(triggerTimeStr) ? "" : triggerTimeStr);
                variables.put("excuteTask", StringUtils.isEmpty(info.getJobDesc()) ? "" : info.getJobDesc());
                variables.put("excuteResult", jobLog.getTriggerCode() == ReturnT.SUCCESS_CODE ? "成功" : "失败");
                variables.put("excuteLog", StringUtils.isEmpty(jobLog.getTriggerMsg()) ? "" : jobLog.getTriggerMsg());
                variables.put("excuteAddress", StringUtils.isEmpty(jobLog.getExecutorAddress()) ? "无" : jobLog.getExecutorAddress());
                String replacedJson = replaceVariables(DEFAULT_MESSAGE_TEMPLATE, variables);
                JSONObject jsonObject = JSON.parseObject(replacedJson);
                FeiShuUtil.sendTextMessage(JSON.toJSONString(jsonObject), alarmUrl);
            } catch (Exception e) {
                log.error("job alarm with feishu error", e);
                return false;
            }
        }
        return true;
    }

    /**
     * 替换JSON字符串中的变量
     *
     * @param template   JSON模板字符串
     * @param variables  变量映射表
     * @return 替换后的JSON字符串
     */
    public static String replaceVariables(String template, Map<String, String> variables) {
        String result = template;
        // 使用正则表达式匹配 $变量名 格式
        Pattern pattern = Pattern.compile("\\$(\\w+)");
        Matcher matcher = pattern.matcher(result);

        while (matcher.find()) {
            // 完整匹配，如 "$excuteTime"
            String fullMatch = matcher.group(0);
            // 变量名，如 "excuteTime"
            String varName = matcher.group(1);
            // 如果变量存在于映射表中，则替换
            if (variables.containsKey(varName)) {
                String replacement = variables.get(varName);
                // 处理JSON中的引号转义
                replacement = replacement.replace("\"", "\\\"");
                result = result.replace(fullMatch, replacement);
            }
        }
        return result;
    }
}
```

### 1.5 测试

[](https://arcsoft6.feishu.cn/space/api/box/stream/download/asynccode/?code=YzE4ZGY3NGQ4Mjk3ZWM5MmNmYTcyMWUwYTMzNDA2MTdfRHhESWp5NGhxem4xc2J0WUdsdFRTSXdQcEhOZ3luTVpfVG9rZW46T2UwdWJkSHdWb3RqSnB4M002NGNDdXlQbjJiXzE3NTg4NjYzNjY6MTc1ODg2OTk2Nl9WNA)

![image.png](XXL-Job%E5%AE%9E%E8%B7%B5%E4%B8%8E%E6%BA%90%E7%A0%81%E5%A2%9E%E5%BC%BA%E5%AE%9E%E8%B7%B5/image%204.png)