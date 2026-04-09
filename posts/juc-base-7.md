![Untitled](JUC%E6%8A%80%E6%9C%AF%E7%AF%87(%E4%B8%83)%EF%BC%9AFinal%E5%85%B3%E9%94%AE%E5%AD%97/Untitled.jpeg)

## **JUC并发-Final关键字**

- 所有的final修饰的字段都是编译期常量吗?
    
    需要注意，不是所有被`final`修饰的字段都是编译期常量。`final`修饰的字段可以是编译期常量，也可以是运行时常量，这取决于它们的具体定义和初始化方式。
    
    如果一个`final`字段被声明为基本数据类型或`String`类型，并且在声明时就被赋予了一个常量表达式（如字面值、常量或者其他`final`字段的组合），那么它将被视为编译期常量。编译器会在编译时将这个常量值直接嵌入到使用它的地方，而不是在运行时读取字段的值。
    

示例：

```
final int x = 10; // 编译期常量
final String str = "Hello"; // 编译期常量
```

然而，如果一个`final`字段是在运行时才被初始化的，那么它将被视为运行时常量。这意味着它的值在运行时才确定，并且不能被编译器嵌入到使用它的地方。

示例：

```
final int y;
y = 20; // 运行时常量
```

需要注意的是，对于引用类型的`final`字段，虽然字段本身是不可变的（即不能再指向其他对象），但是字段所引用的对象本身的状态可以被修改。

总结起来，`final`修饰的字段可以是编译期常量或运行时常量，具体取决于字段的类型、声明和初始化方式。编译期常量在编译时就确定了它们的值，而运行时常量的值在运行时才确定。

- 如何理解private所修饰的方法是隐式的final?父类的final方法能不能够被子类重写?
    
    类中所有private方法都隐式地指定为final的，由于无法取用private方法，所以也就不能覆盖它。可以对private方法增添final关键字，但这样做并没有什么意义。看下下面的例子：
    

```
public class Base {
    private void test() {
    }
}

public class Son extends Base{
    public void test() {
    }
    public static void main(String[] args) {
        Son son = new Son();
        Base father = son;
        //father.test();
    }
}
```

Base和Son都有方法test(),但是这并不是一种覆盖，因为private所修饰的方法是隐式的final，也就是无法被继承，所以更不用说是覆盖了，在Son中的test()方法不过是属于Son的新成员罢了，Son进行向上转型得到father，但是father.test()是不可执行的，因为Base中的test方法是private的，无法被访问到。

- 说说final类型的类如何拓展? 比如String是final类型，我们想写个MyString复用所有String中方法，同时增加一个新的toMyString()的方法，应该如何做?
    
    只能通过组合的方式来实现。设计模式中最重要的两种关系，一种是继承/实现；另外一种是组合关系。所以当遇到不能用继承的(final修饰的类),应该考虑用组合, 如下代码大概写个组合实现的意思：
    

```
class MyString{

    private String innerString;

    // ...init & other methods

    // 支持老的方法
    public int length(){
        return innerString.length(); // 通过innerString调用老的方法
    }

    // 添加新方法
    public String toMyString(){
        //...
    }
}
```

- final方法可以被重载吗? 可以
    
    我们知道父类的final方法是不能够被子类重写的，那么final方法可以被重载吗? 答案是可以的，下面代码是正确的。
    

```
public class FinalExampleParent {
    public final void test() {
    }

    public final void test(String str) {
    }
}
```

- 说说final域对于基本数据类型的重排序规则?
    - `final域读`：禁止初次读对象的引用与读该对象包含的final域的重排序。
    - `final域写` 禁止final域写与构造方法重排序，即禁止final域写重排序到构造方法之外，从而保证该对象对所有线程可见时，该对象的final域全部已经初始化过。
- final域对于引用数据类型的重排序规则?：
    - `额外增加约束`：禁止在构造函数对一个final修饰的对象的成员域的写入与随后将这个被构造的对象的引用赋值给引用变量 重排序
- 说说final的原理?
    
    写final域会要求编译器在final域写之后，构造函数返回前插入一个StoreStore屏障。读final域的重排序规则会要求编译器在读final域的操作前插入一个LoadLoad屏障。很有意思的是，如果以X86处理为例，X86不会对写-写重排序，所以StoreStore屏障可以省略。由于不会对有间接依赖性的操作重排序，所以在X86处理器中，读final域需要的LoadLoad屏障也会被省略掉。也就是说，以X86为例的话，对final域的读/写的内存屏障都会被省略！具体是否插入还是得看是什么处理器。
    
- 使用 final 的限制条件和局限性?
    
    当声明一个 final 成员时，必须在构造函数退出前设置它的值。将指向对象的成员声明为 final 只能将该引用设为不可变的，而非所指的对象。如果一个对象将会在多个线程中访问并且你并没有将其成员声明为 final，则必须提供其他方式保证线程安全。