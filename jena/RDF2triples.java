import org.apache.jena.rdf.model.Model ;
import org.apache.jena.rdf.model.ModelFactory ;
import org.apache.jena.rdf.model.RDFNode;
import org.apache.jena.rdf.model.StmtIterator;
import org.apache.jena.rdf.model.Statement;
import org.apache.jena.rdf.model.impl.StmtIteratorImpl;
import java.util.*;
import java.io.FileWriter;
import java.io.IOException;


public class rdf2triples
{
    public static void main(String[] args) {
		
  
	
        Model m = ModelFactory.createDefaultModel() ;
        // read into the model.
		String fileName=args[0];
        m.read(fileName);//,"http://xxx.org") ;
	
		
 StmtIterator sIter = m.listStatements();
 String str="";
 int i=0;
 while (sIter.hasNext()){
	 Statement statement =sIter.next();
	 if(i++>0)
		 str+=".\n" ;
		//str+=",\n" ;
	String objectStr="";
	RDFNode objectNode=statement.getObject();
	
	if(objectNode.isResource())
		objectStr="<"+objectNode.toString()+">";
	else
		objectStr="'"+objectNode.toString().replaceAll("'","")+"'";
		
	str+=("<"+statement.getSubject().toString()+"> <"+statement.getPredicate().toString()+"> "+objectStr+"");
	//	str+=("[\""+statement.getSubject().toString()+"\",\""+statement.getPredicate().toString()+"\",\""+statement.getObject()+"\"]");
	 
 }
 
/* List  array= sIter.toList();*/

 
 
 // String jsonStr="{\"triples\":["+str+"]}";
 
System.out.println(str);
 
 return;
 
 

}
}