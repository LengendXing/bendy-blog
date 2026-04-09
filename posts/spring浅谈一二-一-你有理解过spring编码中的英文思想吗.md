> 技术水平低，请勿见怪
> 

# 🤔 用学英语的方式去打开Spring的学习之路？

别的先不说了，先看一张图：

（图片来源：[Spring生命周期Bean初始化过程详解_spring初始化bean过程_Life journey的博客-CSDN博客](https://blog.csdn.net/scjava/article/details/109271781)）

![Untitled](Spring%E6%B5%85%E8%B0%88%E4%B8%80%E4%BA%8C(%E4%B8%80)%EF%BC%9A%E4%BD%A0%E6%9C%89%E7%90%86%E8%A7%A3%E8%BF%87Spring%E7%BC%96%E7%A0%81%E4%B8%AD%E7%9A%84%E8%8B%B1%E6%96%87%E6%80%9D%E6%83%B3%E5%90%97%EF%BC%9F/Untitled.png)

熟悉吧，这不就是学习Spring的时候都会学习的一个基础知识点吗？但你有从英语语义的角度去思考过这个流程吗？没有吗？那太好了，我带你看一波：

先来看常见理解：

简单的去说就是四个阶段，实例化阶段，初始化阶段，调用阶段，销毁阶段；而详细的去描述的话，首先，先说这个实例化阶段，实例化的过程中，也就是实例化之前，他首先还要进行实例化检测，这个过程就是Spring需要确认使用哪种方式去实例化对象，也就是推断他的构造方法，然后紧接着Spring就会去扫描实例化后的对象的成员属性，进行属性注入，也就是DI的过程，依赖注入，然后，在此之后，属性处理完成，Spring就会去处理一些Aware接口的回调，其中包括比如BeanNameAware以及ApplicationContextAware 等等，完成这些回调接口的调用之后，Spring会看当前Bean某些方法是否有这个@PostConstruct注解，就会在初始化前执行这个方法，然后执行初始化，初始化中，Spring回去检查你是否实现了InitializingBean接口，如果实现了，那么就回去执行afterPropertiesSet函数，完成了初始化之后，bean已经准备就绪，此时Bean会一直驻留在上下文中，直到应用被销毁，如果bean实现了DisposableBean接口，那么在销毁的时候，Spring会调用他的Destroy接口方法，销毁Bean实例。

我是怎么想的：

我就简单就一个方面去说吧，比如Spring在初始化过程中会调用一些Aware接口，可是如果我们以英语语义的角度去看待这个过程，不就很简单了吗？是的，发现了吗？Aware是一个连系动词，直接接在Be动词后面，在语义上带有一定的感官色彩，所以他也是一个感官动词，那么Aware原意是什么？是意识到，意识的意思，所以，Spring要意识接口干嘛，很简单，Spring通过Ioc容器创建了这个对象，Spring就是上帝，上帝赋予了他实例，需要在赋予它意识，意识到自己的beanName，所以有beanNameAware，意识到自己的ApplicationContext，所以有applicationContextAware。所以这是一个什么过程，Spring在创造一个对象的同时，赋予了灵魂。这完美契合了OOP的核心思想，创建一个对象的同时，同时赋予它操作对象属性的方法。

<aside>
💡 有关Spring编码中的英文思想的问题，欢迎您在底部评论区留言，一起交流~

</aside>